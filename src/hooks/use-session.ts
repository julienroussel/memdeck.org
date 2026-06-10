import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { eventBus } from "../services/event-bus";
import type { DistanceConvention, DistanceMode } from "../types/distance";
import type { FlashcardMode } from "../types/flashcard";
import type {
  ActiveSession,
  ActiveSessionBase,
  AnswerOutcome,
  SessionConfig,
  SessionPhase,
  SessionSummary,
} from "../types/session";
import type { SpotCheckMode } from "../types/spot-check";
import type { StackLimits } from "../types/stack-limits";
import type { StackKey } from "../types/stacks";
import { reportSessionPersistenceFailed } from "../utils/localstorage-telemetry";
import {
  clearLastSaveFailedBreadcrumb,
  hasLastSaveFailedNotificationBeenShown,
  markLastSaveFailedNotificationShown,
  readLastSaveFailedBreadcrumb,
} from "../utils/session-breadcrumbs";
import {
  type FinalizeFailureReason,
  finalizeSession,
} from "../utils/session-persistence";
import {
  applyAnswerOutcome,
  deriveActiveSession,
  deriveIsStructuredSession,
  meetsMinimumSaveThreshold,
} from "../utils/session-phase";
import { useSessionAutoSave } from "./use-session-auto-save";
import { useSessionRecording } from "./use-session-recording";

export type { SessionPhase } from "../types/session";

// Surface a write failure when auto-saving the previous session: the prior
// session is dropped either way (the new one replaces it), so a silent failure
// here skipped both telemetry and the toast. Extracted to keep startSession
// under the cognitive-complexity ceiling.
const reportPriorSessionFinalizeFailure = (
  reason: FinalizeFailureReason,
  t: ReturnType<typeof useTranslation>["t"]
) => {
  reportSessionPersistenceFailed(reason, "useSession:startSession");
  const isUnrecoverable =
    reason === "corrupt" || reason === "corrupt-prior-state";
  notifications.show({
    color: isUnrecoverable ? "red" : "yellow",
    title: t(
      isUnrecoverable
        ? "errors.sessionStorageCorrupt.title"
        : "errors.sessionSaveFailed.title"
    ),
    message: t(
      isUnrecoverable
        ? "errors.sessionStorageCorrupt.message"
        : "errors.sessionSaveFailed.message"
    ),
  });
};

type UseSessionOptionsBase = {
  stackKey: StackKey;
  autoStart?: boolean;
  stackLimits?: StackLimits;
  timed?: boolean;
};

type UseSessionOptions =
  | (UseSessionOptionsBase & {
      mode: "flashcard";
      flashcardMode?: FlashcardMode;
    })
  | (UseSessionOptionsBase & { mode: "acaan" })
  | (UseSessionOptionsBase & {
      mode: "spotcheck";
      spotCheckMode?: SpotCheckMode;
    })
  | (UseSessionOptionsBase & {
      mode: "distance";
      distanceMode?: DistanceMode;
      distanceConvention?: DistanceConvention;
    });

type UseSessionResult = {
  status: SessionPhase;
  startSession: (config: SessionConfig) => void;
  handleAnswer: (outcome: AnswerOutcome) => void;
  startNewSession: () => void;
  isStructuredSession: boolean;
  activeSession: ActiveSession | null;
  stopSession: () => void;
  dismissSummary: () => void;
};

/**
 * Discriminated result from `tryFinalizeSession` — lets callers distinguish
 * an already-finalized no-op (`duplicate`) from a true write failure
 * (`write-failed`) so they can decide whether to surface the failure to
 * analytics or the user. `finalized` carries the computed summary on success.
 *
 * The `reason` on `write-failed` is `FinalizeFailureReason` — the same union
 * as `FinalizeSessionResult.reason` — so callers can differentiate
 * quota/serialization failures from a corrupt on-disk state where the
 * rollback also failed.
 */
export type TryFinalizeSessionResult =
  | { status: "finalized"; summary: SessionSummary }
  | { status: "duplicate" }
  | { status: "write-failed"; reason: FinalizeFailureReason };

export const useSession = (options: UseSessionOptions): UseSessionResult => {
  const { t } = useTranslation();
  // Hold the latest `t` in a ref so the flush and breadcrumb effects' deps
  // don't include `t`. `useTranslation`'s `t` changes identity on language
  // change; if it were in the dep array, switching languages mid-session
  // would re-run the flush effect (wasted work, and risks racing the
  // pending-finalization queue) and re-fire the mount breadcrumb check
  // (already latched, but the ref keeps the intent explicit and the dep
  // list mount-only). Mirrors the pattern in use-session-auto-save.ts.
  const tRef = useRef(t);
  tRef.current = t;
  const { mode, stackKey, autoStart = false, timed = false } = options;
  const stackLimits = options.stackLimits;
  const stackLimitsRef = useRef(stackLimits);
  stackLimitsRef.current = stackLimits;
  const flashcardMode =
    options.mode === "flashcard" ? options.flashcardMode : undefined;
  const spotCheckMode =
    options.mode === "spotcheck" ? options.spotCheckMode : undefined;
  const distanceMode =
    options.mode === "distance" ? options.distanceMode : undefined;
  const distanceConvention =
    options.mode === "distance" ? options.distanceConvention : undefined;
  const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
  const statusRef = useRef(status);
  statusRef.current = status;

  const pendingFinalizationRef = useRef<ActiveSession | null>(null);
  const finalizedIdsRef = useRef<Set<string>>(new Set());
  // Tracks session ids the auto-finalize effect has already requested
  // finalization for, so unrelated status changes (e.g. a limits-merge
  // re-render after the threshold has been crossed) don't re-fire. The
  // persistence layer additionally dedupes via finalizedIdsRef.
  const requestedFinalizationIdsRef = useRef<Set<string>>(new Set());

  // Tick counter used to force a re-render after a ref-only mutation
  // (e.g. queueing a session for finalization). The flush effect below
  // depends on `flushTick` so it runs whenever a caller bumps the tick
  // (and on initial mount). Every code path that queues work calls
  // `triggerFlush`, so the effect is guaranteed to fire after the queue
  // is populated.
  const [flushTick, setFlushTick] = useState(0);
  const triggerFlush = useCallback(() => {
    setFlushTick((n) => n + 1);
  }, []);

  /**
   * Deduplicating wrapper around finalizeSession. Returns a discriminated
   * status so callers (e.g. the unmount/beforeunload path in
   * useSessionAutoSave) can distinguish "already finalized" (no-op) from
   * a true write failure that warrants surfacing to analytics.
   *
   * The id is added to `finalizedIdsRef` ONLY on a successful write so that
   * a failed save can be retried from a subsequent path (e.g. user taps Stop
   * again after clearing storage).
   */
  const tryFinalizeSession = useCallback(
    (session: ActiveSession): TryFinalizeSessionResult => {
      if (finalizedIdsRef.current.has(session.id)) {
        return { status: "duplicate" };
      }
      const result = finalizeSession(session);
      if (!result.ok) {
        return { status: "write-failed", reason: result.reason };
      }
      finalizedIdsRef.current.add(session.id);
      return { status: "finalized", summary: result.summary };
    },
    []
  );

  /**
   * Queue a session for finalization via the flush effect. Used by
   * `stopSession` and by auto-save paths that have time for a re-render
   * (stack-change). Mutates the ref outside any setState updater (see F4)
   * and forces a render via `triggerFlush` so the flush effect picks it up.
   *
   * Snapshots the latest `stackLimits` at queue time so the persisted record
   * reflects the range in effect when finalization was requested, regardless
   * of whether the limits-merge effect below has run yet on this render.
   * This makes the queueing invariant local — callers don't have to depend
   * on effect-ordering to get the right snapshot. The limits-merge effect
   * still patches the queued ref for the post-queue change case.
   */
  const requestFinalization = useCallback(
    (session: ActiveSession) => {
      pendingFinalizationRef.current = {
        ...session,
        stackLimits: stackLimitsRef.current,
      };
      triggerFlush();
    },
    [triggerFlush]
  );

  // If the user changes the stack range mid-session, the in-memory game
  // reducer resets to the new range but the active session's stackLimits
  // snapshot is stale — recorded answers would be persisted under the
  // original range. Re-snapshot when limits change so the persisted record
  // describes the range in effect when it ends.
  //
  // This effect MUST run before the finalization-flush effect below: when a
  // limits change happens in the same render as a stopSession() call, the
  // queued pendingFinalizationRef is what the flush effect persists. This
  // effect patches that ref FIRST so the persisted record reflects the new
  // limits.
  useEffect(() => {
    if (statusRef.current.phase !== "active") {
      return;
    }
    const current = statusRef.current.session.stackLimits;
    const same =
      current === stackLimits ||
      (current !== undefined &&
        stackLimits !== undefined &&
        current.start === stackLimits.start &&
        current.end === stackLimits.end);
    if (same) {
      return;
    }
    // If a stop / auto-complete already queued this session for finalization,
    // patch the queued reference too — otherwise the persisted record carries
    // pre-update limits.
    if (pendingFinalizationRef.current !== null) {
      pendingFinalizationRef.current = {
        ...pendingFinalizationRef.current,
        stackLimits,
      };
    }
    setStatus((prev) => {
      if (prev.phase !== "active") {
        return prev;
      }
      return {
        phase: "active",
        session: { ...prev.session, stackLimits },
      };
    });
  }, [stackLimits]);

  // Flush effect — depends on `flushTick`, which every queueing path
  // (`requestFinalization`, etc.) bumps via `triggerFlush`. The effect picks
  // up `pendingFinalizationRef` whenever the tick changes (and on initial
  // mount to drain anything queued during the first render). Using `[]` here
  // would only run once on mount and silently break structured session
  // completion; depending on `flushTick` instead bounds re-runs to the cases
  // where work was actually queued.
  //
  // We inline dedupe + finalizeSession here (rather than reusing
  // tryFinalizeSession) so we can distinguish "already finalized" from
  // "persistence failed" via the discriminated FinalizeSessionResult, and only
  // transition to the summary phase on a successful write. On failure we
  // surface a Mantine notification so the user knows the session wasn't saved
  // — and we KEEP `phase: "active"` so the user can retry Stop after clearing
  // storage. A `corrupt` reason (rollback failed → on-disk inconsistency) is
  // additionally reported via analytics so we have observability on a state
  // the user cannot self-recover from without clearing storage.
  useEffect(() => {
    // `flushTick` is purely a trigger — value is irrelevant. The early return
    // also keeps the dep list satisfied (linter requires a usage, not just an
    // entry). On first mount no finalization has been requested.
    if (flushTick === 0) {
      return;
    }
    const session = pendingFinalizationRef.current;
    if (session === null) {
      return;
    }
    pendingFinalizationRef.current = null;
    if (finalizedIdsRef.current.has(session.id)) {
      return;
    }
    const result = finalizeSession(session);
    if (result.ok) {
      finalizedIdsRef.current.add(session.id);
      setStatus({ phase: "summary", summary: result.summary });
      return;
    }
    // Report every finalize failure to analytics so quota/serialize/corrupt
    // buckets are all observable in GA — the auto-save cleanup path reports
    // unconditionally, and asymmetry here was undercounting user-Stop quota
    // failures. `reportSessionPersistenceFailed` names the GA exception so
    // write failures aggregate with `useLocalDb`'s. Distinct copy per reason
    // still drives the user-facing message:
    //  - corrupt / corrupt-prior-state: retry won't help; tell user to clear
    //    storage. Mark the session id as finalized so we don't re-show the
    //    notification on every Stop click.
    //  - serialize-failed / write-failed: keep phase: "active" so the user
    //    can retry Stop after clearing space.
    reportSessionPersistenceFailed(result.reason, "useSession:flush");
    const isUnrecoverable =
      result.reason === "corrupt" || result.reason === "corrupt-prior-state";
    if (isUnrecoverable) {
      finalizedIdsRef.current.add(session.id);
      notifications.show({
        color: "red",
        title: tRef.current("errors.sessionStorageCorrupt.title"),
        message: tRef.current("errors.sessionStorageCorrupt.message"),
      });
      return;
    }
    notifications.show({
      color: "red",
      title: tRef.current("errors.sessionSaveFailed.title"),
      message: tRef.current("errors.sessionSaveFailed.message"),
    });
    // Leave phase: "active" intact so the user can retry Stop. The pending ref
    // has been cleared above, so this effect won't loop.
  }, [flushTick]);

  // On mount, surface a "last save failed" breadcrumb left by the
  // beforeunload/unmount auto-save path (which can't show notifications
  // because it runs while the page is closing). Two layers of idempotence:
  //   1. lastSaveBreadcrumbCheckedRef — within-mount: prevents re-render
  //      re-fire.
  //   2. sessionStorage sentinel keyed on breadcrumb.failedAt — across
  //      mounts in the same tab: backstop when clearLastSaveFailedBreadcrumb
  //      cannot persist and the breadcrumb pins (issue #629). A new
  //      breadcrumb with a different failedAt naturally invalidates it.
  const lastSaveBreadcrumbCheckedRef = useRef(false);
  useEffect(() => {
    if (lastSaveBreadcrumbCheckedRef.current) {
      return;
    }
    lastSaveBreadcrumbCheckedRef.current = true;
    const breadcrumb = readLastSaveFailedBreadcrumb();
    if (breadcrumb === null) {
      return;
    }
    // Sentinel check before clear: in the stuck-breadcrumb scenario, every
    // mount would otherwise re-enter the failing clear path and fire
    // analytics.trackError on every reload. Skipping clear when the sentinel
    // already matches is safe — clear was attempted at least once on the
    // prior mount.
    if (hasLastSaveFailedNotificationBeenShown(breadcrumb.failedAt)) {
      return;
    }
    clearLastSaveFailedBreadcrumb();
    // Mark before show: a (defensive) notifications.show throw must not
    // allow the notification to re-fire on the next mount. `tRef` keeps the
    // latest translation available without putting `t` in the dep list
    // (which would re-fire this on language change).
    markLastSaveFailedNotificationShown(breadcrumb.failedAt);
    notifications.show({
      color: "yellow",
      title: tRef.current("errors.lastSaveFailed.title"),
      message: tRef.current("errors.lastSaveFailed.message"),
    });
  }, []);

  const startSession = useCallback(
    (config: SessionConfig) => {
      // Auto-save current active session if it meets minimum threshold.
      // The previous session is dropped either way (the new one replaces it),
      // so a write failure must be surfaced here — mirrors the reporting +
      // toast pattern of the flush effect and useSessionAutoSave's cleanup
      // path; silently discarding the result skipped both.
      if (statusRef.current.phase === "active") {
        const { session } = statusRef.current;
        if (meetsMinimumSaveThreshold(session)) {
          const result = tryFinalizeSession(session);
          if (result.status === "write-failed") {
            reportPriorSessionFinalizeFailure(result.reason, tRef.current);
          }
        }
      }

      finalizedIdsRef.current.clear();
      requestedFinalizationIdsRef.current.clear();

      const baseSession: ActiveSessionBase = {
        id: crypto.randomUUID(),
        stackKey,
        config,
        startedAt: new Date().toISOString(),
        successes: 0,
        fails: 0,
        questionsCompleted: 0,
        currentStreak: 0,
        bestStreak: 0,
        stackLimits: stackLimitsRef.current,
        timed,
      };

      let session: ActiveSession;
      if (mode === "flashcard") {
        session = {
          ...baseSession,
          mode: "flashcard" as const,
          flashcardMode: flashcardMode ?? "bothmodes",
        };
      } else if (mode === "spotcheck") {
        session = {
          ...baseSession,
          mode: "spotcheck" as const,
          spotCheckMode: spotCheckMode ?? "missing",
        };
      } else if (mode === "distance") {
        session = {
          ...baseSession,
          mode: "distance" as const,
          distanceMode: distanceMode ?? "both",
          distanceConvention: distanceConvention ?? "cyclic",
        };
      } else {
        session = { ...baseSession, mode: "acaan" as const };
      }
      setStatus({ phase: "active", session });
      eventBus.emit.SESSION_STARTED({ mode, config });
    },
    [
      mode,
      stackKey,
      flashcardMode,
      spotCheckMode,
      distanceMode,
      distanceConvention,
      timed,
      tryFinalizeSession,
    ] // stackLimits removed, accessed via ref
  );

  const { recordCorrect, recordIncorrect, recordQuestionAdvanced } =
    useSessionRecording({
      setStatus,
    });

  // Auto-finalize a structured session when its question target is reached.
  // Driven by the COMMITTED status so increments queued by recordCorrect /
  // recordIncorrect that ran in the same event handler as
  // recordQuestionAdvanced are reflected in the persisted record. The dedupe
  // ref keys on session.id so unrelated status changes (e.g. a limits-merge
  // re-render) don't re-fire after the threshold has already been requested;
  // the persistence layer additionally dedupes via finalizedIdsRef.
  useEffect(() => {
    if (status.phase !== "active") {
      return;
    }
    const { session } = status;
    if (session.config.type !== "structured") {
      return;
    }
    if (session.questionsCompleted < session.config.totalQuestions) {
      return;
    }
    if (requestedFinalizationIdsRef.current.has(session.id)) {
      return;
    }
    requestedFinalizationIdsRef.current.add(session.id);
    requestFinalization(session);
  }, [status, requestFinalization]);

  const handleAnswer = useCallback(
    (outcome: AnswerOutcome) => {
      if (statusRef.current.phase !== "active") {
        return;
      }
      applyAnswerOutcome(outcome, {
        recordCorrect,
        recordIncorrect,
        recordQuestionAdvanced,
      });
    },
    [recordCorrect, recordIncorrect, recordQuestionAdvanced]
  );

  const stopSession = useCallback(() => {
    const current = statusRef.current;
    if (current.phase !== "active") {
      return;
    }
    if (!meetsMinimumSaveThreshold(current.session)) {
      setStatus({ phase: "idle" });
      return;
    }
    requestFinalization(current.session);
  }, [requestFinalization]);

  const dismissSummary = useCallback(() => {
    setStatus({ phase: "idle" });
  }, []);

  const startNewSession = useCallback(() => {
    const config: SessionConfig =
      statusRef.current.phase === "summary"
        ? statusRef.current.summary.record.config
        : { type: "open" };
    dismissSummary();
    startSession(config);
  }, [dismissSummary, startSession]);

  // Auto-starting an open session means training is tracked from the moment the
  // user visits the page. Sessions with fewer than 3 questions are discarded
  // (see meetsMinimumSaveThreshold), so brief visits don't pollute history.
  //
  // Two triggers, both gated on idle:
  //  1. Initial mount with autoStart already true — the common case (a direct
  //     visit, or a deep-link stripped before this effect first ran).
  //  2. autoStart flipping false → true. Callers pass `autoStart:
  //     !deepLinkPending`, so this fires exactly when a `?try=`/`?timed=`
  //     deep-link is consumed on an already-mounted page — the post-session
  //     "Try it" (#698), which re-navigates to the same page the user just
  //     finished a session on. The single-shot `initialMountRef` alone would
  //     never re-fire there, leaving the preselected variant idle.
  // A plain Stop or summary dismiss returns to idle WITHOUT changing autoStart,
  // so neither is a re-arm signal — they must not auto-restart a session.
  const initialMountRef = useRef(true);
  const prevAutoStartRef = useRef(autoStart);
  useEffect(() => {
    const justArmed = autoStart && !prevAutoStartRef.current;
    prevAutoStartRef.current = autoStart;
    const isInitialMount = initialMountRef.current;
    initialMountRef.current = false;
    if (autoStart && status.phase === "idle" && (isInitialMount || justArmed)) {
      startSession({ type: "open" });
    }
  }, [autoStart, status.phase, startSession]);

  useSessionAutoSave({
    stackKey,
    statusRef,
    setStatus,
    tryFinalizeSession,
    requestFinalization,
  });

  const activeSession = deriveActiveSession(status);
  const isStructuredSession = deriveIsStructuredSession(activeSession);

  return {
    status,
    startSession,
    handleAnswer,
    startNewSession,
    isStructuredSession,
    activeSession,
    stopSession,
    dismissSummary,
  };
};
