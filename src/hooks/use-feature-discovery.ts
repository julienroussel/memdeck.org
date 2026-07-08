import { useCallback, useMemo } from "react";
import {
  DISCOVERY_MIN_SESSIONS,
  DISCOVERY_SNOOZE_SESSIONS,
  FEATURE_DISCOVERY_LSK,
  SHARE_NUDGE_DISMISSED_LSK,
} from "../constants";
import { analytics } from "../services/analytics";
import type {
  DiscoverySurface,
  FeatureDiscoveryState,
  FeatureSuggestion,
} from "../types/discovery";
import type { SessionRecord } from "../types/session";
import { isFeatureDiscoveryState } from "../utils/discovery-typeguards";
import { deriveFeatureUsage } from "../utils/feature-usage";
import { useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";
import { isShareNudgePending } from "../utils/share-nudge-eligibility";
import {
  SUGGESTION_CATALOG,
  TOTAL_SUGGESTIONS,
} from "../utils/suggestion-catalog";
import { useAllTimeStats } from "./use-all-time-stats";
import { useSessionHistory } from "./use-session-history";

const DEFAULT_DISCOVERY_STATE: FeatureDiscoveryState = {
  dismissed: [],
  snoozedUntil: 0,
};

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

export type UseFeatureDiscoveryResult = {
  /** Highest-priority eligible suggestion, or null when nothing should show. */
  nextSuggestion: FeatureSuggestion | null;
  /** Retire-on-accept: permanently drops the suggestion and tracks acceptance. */
  accept: (id: string, surface: DiscoverySurface) => void;
  /** Drops the suggestion and snoozes the whole surface for a few sessions. */
  dismiss: (id: string, surface: DiscoverySurface) => void;
  /** How many catalog items the user has tried (monotonic). */
  exploredCount: number;
  /** Fixed full-catalog size — the progress denominator. */
  totalCount: number;
};

export type UseFeatureDiscoveryOptions = {
  /**
   * The just-finished session, for the post-session ("summary") surface. Two
   * effects:
   *  1. Folds the record into usage so the variant the user *just* completed
   *     counts. This surface mounts at phase "summary" — after `finalizeSession`
   *     wrote history and `setStatus` re-rendered — and `useLocalDb`'s
   *     `getSnapshot` re-reads localStorage every render, so `useSessionHistory`
   *     here *already* includes this record. Folding it in is therefore a
   *     belt-and-suspenders guarantee (deduped by id) that the just-finished
   *     variant is counted regardless of snapshot timing — not a fix for a stale
   *     read.
   *  2. Restricts suggestions to this record's mode, keeping the prompt
   *     "same-mode" ("nailed that — ready for X?"). This is the load-bearing
   *     effect: the just-played mode isn't otherwise available to the hook.
   */
  completedRecord?: SessionRecord;
};

export const useFeatureDiscovery = (
  options: UseFeatureDiscoveryOptions = {}
): UseFeatureDiscoveryResult => {
  const { completedRecord } = options;
  const { history } = useSessionHistory();
  const { getGlobalStats } = useAllTimeStats();
  const { totalSessions } = getGlobalStats();

  const [state, setState] = useLocalDb<FeatureDiscoveryState>(
    FEATURE_DISCOVERY_LSK,
    DEFAULT_DISCOVERY_STATE,
    isFeatureDiscoveryState,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  // Read-only mirror of the share-nudge flag so the discovery card reappears
  // reactively once the share nudge is dismissed. This instance never writes.
  const [shareDismissed] = useLocalDb<boolean>(
    SHARE_NUDGE_DISMISSED_LSK,
    false,
    isBoolean,
    { onCorrupt: reportLocalDbCorruption }
  );

  const usage = useMemo(
    () =>
      deriveFeatureUsage(
        completedRecord
          ? [
              completedRecord,
              ...history.filter((record) => record.id !== completedRecord.id),
            ]
          : history
      ),
    [history, completedRecord]
  );

  const exploredCount = useMemo(
    () =>
      SUGGESTION_CATALOG.filter((suggestion) => suggestion.isUsed(usage))
        .length,
    [usage]
  );

  const nextSuggestion = useMemo<FeatureSuggestion | null>(() => {
    // One card at a time: yield while the share nudge is still pending.
    if (isShareNudgePending(shareDismissed, totalSessions)) {
      return null;
    }
    // `totalSessions` (and the snooze gate below) read the all-time-stats
    // snapshot, which on the post-session "summary" surface reflects the
    // *post-completion* count: this surface mounts at phase "summary" (after
    // finalizeSession wrote all-time-stats), and `useLocalDb`'s `getSnapshot`
    // re-reads localStorage on that re-render — so the just-finished session is
    // already counted here. The gates therefore act on the up-to-date count (a
    // freshly earned 3rd session opens the prompt immediately, not one session
    // later). Don't add a +1 — the count is already current.
    if (totalSessions < DISCOVERY_MIN_SESSIONS) {
      return null;
    }
    if (totalSessions < state.snoozedUntil) {
      return null;
    }

    const candidates = SUGGESTION_CATALOG.filter(
      (suggestion) =>
        suggestion.isApplicable(usage) &&
        !suggestion.isUsed(usage) &&
        !state.dismissed.includes(suggestion.id) &&
        // Same-mode only on the post-session surface (the "ready for X?" prompt
        // continues the mode just played); unrestricted everywhere else.
        (completedRecord ? suggestion.mode === completedRecord.mode : true)
    );

    // Untried whole modes → untried variants of the most-used mode → others.
    const mostUsedBoost = (suggestion: FeatureSuggestion): number =>
      suggestion.mode === usage.mostUsedMode ? 0 : 1;
    const sorted = [...candidates].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      const boostDelta = mostUsedBoost(a) - mostUsedBoost(b);
      if (boostDelta !== 0) {
        return boostDelta;
      }
      return SUGGESTION_CATALOG.indexOf(a) - SUGGESTION_CATALOG.indexOf(b);
    });
    return sorted[0] ?? null;
  }, [shareDismissed, totalSessions, state, usage, completedRecord]);

  const accept = useCallback(
    (id: string, surface: DiscoverySurface): void => {
      setState(
        (prev) => ({
          ...prev,
          dismissed: prev.dismissed.includes(id)
            ? prev.dismissed
            : [...prev.dismissed, id],
        }),
        {
          onSuccess: () =>
            analytics.trackFeatureSuggestionAccepted(id, surface),
        }
      );
    },
    [setState]
  );

  const dismiss = useCallback(
    (id: string, surface: DiscoverySurface): void => {
      setState(
        (prev) => ({
          dismissed: prev.dismissed.includes(id)
            ? prev.dismissed
            : [...prev.dismissed, id],
          snoozedUntil: totalSessions + DISCOVERY_SNOOZE_SESSIONS,
        }),
        {
          onSuccess: () =>
            analytics.trackFeatureSuggestionDismissed(id, surface),
        }
      );
    },
    [setState, totalSessions]
  );

  return {
    accept,
    dismiss,
    exploredCount,
    nextSuggestion,
    totalCount: TOTAL_SUGGESTIONS,
  };
};
