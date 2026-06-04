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

export const useFeatureDiscovery = (): UseFeatureDiscoveryResult => {
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

  const usage = useMemo(() => deriveFeatureUsage(history), [history]);

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
        !state.dismissed.includes(suggestion.id)
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
  }, [shareDismissed, totalSessions, state, usage]);

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
    nextSuggestion,
    accept,
    dismiss,
    exploredCount,
    totalCount: TOTAL_SUGGESTIONS,
  };
};
