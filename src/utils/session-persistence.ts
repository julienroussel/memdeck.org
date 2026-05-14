import {
  ALL_TIME_STATS_LSK,
  MAX_SESSION_HISTORY,
  SESSION_HISTORY_LSK,
} from "../constants";
import { eventBus } from "../services/event-bus";
import type {
  ActiveSession,
  AllTimeStats,
  Encouragement,
  SessionRecord,
  SessionSummary,
} from "../types/session";
import { probeStoredValue } from "./localstorage";
import { calculateAccuracy } from "./session-formatting";
import { createEmptyStatsEntry, statsKey } from "./session-stats";
import { isAllTimeStats, isSessionRecordArray } from "./session-typeguards";

/** Converts an active session to an immutable persisted record */
export const buildSessionRecord = (session: ActiveSession): SessionRecord => {
  const endTime = Date.now();
  const endedAt = new Date(endTime).toISOString();
  const durationSeconds = Math.round(
    (endTime - new Date(session.startedAt).getTime()) / 1000
  );

  const baseRecord = {
    id: session.id,
    stackKey: session.stackKey,
    config: session.config,
    startedAt: session.startedAt,
    endedAt,
    durationSeconds,
    successes: session.successes,
    fails: session.fails,
    questionsCompleted: session.questionsCompleted,
    accuracy: calculateAccuracy(session.successes, session.fails),
    bestStreak: session.bestStreak,
    stackLimits: session.stackLimits,
  };

  switch (session.mode) {
    case "flashcard":
      return {
        ...baseRecord,
        mode: "flashcard" as const,
        flashcardMode: session.flashcardMode,
      };
    case "spotcheck":
      return {
        ...baseRecord,
        mode: "spotcheck" as const,
        spotCheckMode: session.spotCheckMode,
      };
    case "distance":
      return {
        ...baseRecord,
        mode: "distance" as const,
        distanceMode: session.distanceMode,
        distanceConvention: session.distanceConvention,
      };
    case "acaan":
      return { ...baseRecord, mode: "acaan" as const };
    default: {
      // Exhaustiveness check: adding a new ActiveSession variant without handling
      // it here will fail to compile.
      const _exhaustive: never = session;
      return _exhaustive;
    }
  }
};

// --- Persistence ---

/**
 * Reads prior history WITH corruption signal. If the on-disk value fails
 * validation (bad JSON shape, schema drift after an app update, partial
 * write), we return `corrupt` so `finalizeSession` can refuse to overwrite —
 * preventing silent data loss. A truly absent key collapses into `[]` because
 * a brand-new user has nothing to lose.
 *
 * `read-error` from `probeStoredValue` (the read itself threw — Safari ITP,
 * security errors, transient quota during read) is also surfaced as
 * `corrupt` here: a transient read failure is indistinguishable from
 * intact-data-we-can't-read, so refusing to overwrite is the safe default.
 */
const probeSessionHistory = ():
  | {
      status: "ready";
      history: SessionRecord[];
    }
  | { status: "corrupt" } => {
  const probe = probeStoredValue<SessionRecord[]>(
    SESSION_HISTORY_LSK,
    isSessionRecordArray
  );
  if (probe.status === "corrupt" || probe.status === "read-error") {
    return { status: "corrupt" };
  }
  return {
    status: "ready",
    history: probe.status === "valid" ? probe.value : [],
  };
};

const probeAllTimeStats = ():
  | {
      status: "ready";
      stats: AllTimeStats;
    }
  | { status: "corrupt" } => {
  const probe = probeStoredValue<AllTimeStats>(
    ALL_TIME_STATS_LSK,
    isAllTimeStats
  );
  if (probe.status === "corrupt" || probe.status === "read-error") {
    return { status: "corrupt" };
  }
  return {
    status: "ready",
    stats: probe.status === "valid" ? probe.value : {},
  };
};

// --- Encouragement ---

const computeEncouragement = (
  record: SessionRecord,
  previousAvgAccuracy: number | null,
  isNewGlobalBestStreak: boolean
): Encouragement => {
  if (record.accuracy === 1) {
    return { key: "session.encouragement.perfect" };
  }
  if (previousAvgAccuracy === null) {
    return { key: "session.encouragement.greatStart" };
  }
  if (isNewGlobalBestStreak) {
    return {
      key: "session.encouragement.newBestStreak",
      params: { count: record.bestStreak },
    };
  }
  if (record.accuracy > previousAvgAccuracy) {
    return { key: "session.encouragement.improvement" };
  }
  if (record.accuracy >= 0.8) {
    return { key: "session.encouragement.consistent" };
  }
  if (record.accuracy >= 0.5) {
    return { key: "session.encouragement.progress" };
  }
  return { key: "session.encouragement.keepGoing" };
};

/** Generates a session summary with encouragement by comparing to past sessions */
export const computeSessionSummary = (
  record: SessionRecord,
  history: SessionRecord[],
  allTimeStats: AllTimeStats
): SessionSummary => {
  const key = statsKey(record.mode, record.stackKey);

  // Find last 5 sessions for same mode+stack (excluding current)
  const relevantHistory = history
    .filter((r) => r.id !== record.id && statsKey(r.mode, r.stackKey) === key)
    .slice(0, 5);

  const previousAverageAccuracy =
    relevantHistory.length > 0
      ? relevantHistory.reduce((sum, r) => sum + r.accuracy, 0) /
        relevantHistory.length
      : null;

  const statsEntry = allTimeStats[key];
  const isNewGlobalBestStreak =
    statsEntry !== undefined &&
    record.bestStreak > statsEntry.globalBestStreak &&
    record.bestStreak > 0;

  const isAccuracyImprovement =
    previousAverageAccuracy !== null &&
    record.accuracy > previousAverageAccuracy;

  const encouragement = computeEncouragement(
    record,
    previousAverageAccuracy,
    isNewGlobalBestStreak
  );

  return {
    record,
    encouragement,
    isAccuracyImprovement,
    isNewGlobalBestStreak,
    previousAverageAccuracy,
  };
};

/**
 * Result of finalizing a session — discriminated by `ok` so callers handle
 * the persistence failure case explicitly (e.g. quota exceeded in production
 * where the inlined writes swallow the error).
 *
 * Failure reasons:
 * - `write-failed`: a `localStorage.setItem` failure. The on-disk state is
 *   consistent (rolled back if needed).
 * - `serialize-failed`: pre-write `JSON.stringify` failed (cyclic ref,
 *   BigInt, unserializable Map/Date). Distinct from `write-failed` so triage
 *   can split a bad payload from a quota or permissions issue.
 * - `corrupt`: the rollback write itself also failed. History and all-time
 *   stats are persistently out of sync; callers should warn the user that
 *   storage is in an inconsistent state.
 * - `corrupt-prior-state`: the prior history or all-time-stats blob already
 *   in localStorage failed shape validation, so we refused to overwrite it
 *   (otherwise we'd silently destroy potentially-recoverable data).
 *   Callers should tell the user storage is corrupt and stop the auto-retry
 *   loop.
 */
/**
 * Why a `finalizeSession` call failed. Exported so the telemetry reporter
 * (`reportSessionPersistenceFailed`) and `use-session.ts`'s
 * `TryFinalizeSessionResult` share one definition instead of each re-deriving
 * the reason union.
 */
export type FinalizeFailureReason =
  | "write-failed"
  | "serialize-failed"
  | "corrupt"
  | "corrupt-prior-state";

export type FinalizeSessionResult =
  | { ok: true; summary: SessionSummary }
  | { ok: false; reason: FinalizeFailureReason };

/**
 * Finalizes an active session: persists it atomically and returns a summary.
 *
 * Atomicity (best-effort): serializes both payloads in memory, writes history
 * first, then all-time stats. If the second write fails, the history write is
 * rolled back to the previously persisted value and `{ ok: false, reason:
 * 'write-failed' }` is returned. If the rollback write itself also fails (rare
 * — the rollback payload is always smaller-or-equal to the prior persisted
 * value), history and all-time stats end up persistently out of sync and we
 * return `{ ok: false, reason: 'corrupt' }` so callers can surface the
 * inconsistency to the user.
 *
 * Dedupe: in-mount retry safety lives upstream in `use-session.ts` via
 * `finalizedIdsRef`. Here we only avoid duplicating the history entry — if
 * `prevHistory[0].id === record.id` we skip the prepend but still write the
 * stats increment, so a retry after a `corrupt` failure (where history wrote
 * but stats did not) repairs the stats. Worst case is a cross-tab
 * finalize-twice race that double-increments stats by 1 for that record;
 * strictly better than silently dropping the increment.
 *
 * Summary semantics: the summary compares the new record against the PREVIOUS
 * stats (pre-update). We compute it from the in-memory snapshots read before
 * any write, which preserves the existing contract regardless of write order.
 *
 * SESSION_COMPLETED is emitted in both success and failure paths with a
 * `saved` flag so telemetry can distinguish completed-and-saved from
 * completed-but-quota-exceeded (`analytics.trackSessionCompleted` maps the
 * `saved=false` case to a `Save Failed` GA action).
 */
export const finalizeSession = (
  session: ActiveSession
): FinalizeSessionResult => {
  const record = buildSessionRecord(session);

  // Refuse to overwrite corrupt prior state. If we collapsed corruption into
  // `[]`/`{}` here, the next write would prepend `record` onto the empty
  // default and the user would lose every prior session/stats irreversibly.
  // Surface as a distinct reason so the UI can offer a different recovery
  // path (clear storage, export-then-reset) instead of silently retrying.
  const historyProbe = probeSessionHistory();
  const statsProbe = probeAllTimeStats();
  if (historyProbe.status === "corrupt" || statsProbe.status === "corrupt") {
    eventBus.emit.SESSION_COMPLETED({
      mode: record.mode,
      accuracy: record.accuracy,
      questionsCompleted: record.questionsCompleted,
      saved: false,
    });
    return { ok: false, reason: "corrupt-prior-state" };
  }

  const prevHistory = historyProbe.history;
  const prevAllTimeStats = statsProbe.stats;

  // History dedupe: if the prior persisted history already starts with this
  // record's id, skip the prepend so a retry doesn't duplicate the entry. We
  // still proceed with the stats write — that's how a retry after a prior
  // `corrupt` failure repairs the stats. (Per-record stats dedupe is not
  // tracked at this layer; in-mount retry is guarded upstream by
  // `finalizedIdsRef` in `use-session.ts`.)
  const key = statsKey(record.mode, record.stackKey);
  const prevStatsEntry = prevAllTimeStats[key];
  const historyAlreadyContainsRecord = prevHistory[0]?.id === record.id;

  const nextHistory = historyAlreadyContainsRecord
    ? [...prevHistory]
    : [record, ...prevHistory];
  if (nextHistory.length > MAX_SESSION_HISTORY) {
    nextHistory.length = MAX_SESSION_HISTORY;
  }

  // Build new all-time stats. The "previous" entry for summary purposes is
  // always the on-disk one — when stats are missing or empty (e.g. a prior
  // `corrupt` failure left history written but stats unwritten), creating
  // from `createEmptyStatsEntry()` and incrementing yields the correct
  // first-session counts.
  const entry = prevStatsEntry ?? createEmptyStatsEntry();
  const nextAllTimeStats: AllTimeStats = {
    ...prevAllTimeStats,
    [key]: {
      totalSessions: entry.totalSessions + 1,
      totalQuestions: entry.totalQuestions + record.questionsCompleted,
      totalSuccesses: entry.totalSuccesses + record.successes,
      totalFails: entry.totalFails + record.fails,
      globalBestStreak: Math.max(entry.globalBestStreak, record.bestStreak),
    },
  };

  // Compute summary against PREVIOUS state (pre-write) — preserves existing
  // "is this a new best?" semantics. In the corrupt-recovery case the record
  // is already at prevHistory[0]; exclude it so the rolling average reflects
  // the prior history.
  const summaryPrevHistory = historyAlreadyContainsRecord
    ? prevHistory.slice(1)
    : prevHistory;
  const summary = computeSessionSummary(
    record,
    summaryPrevHistory,
    prevAllTimeStats
  );

  const emitCompleted = (saved: boolean) => {
    eventBus.emit.SESSION_COMPLETED({
      mode: record.mode,
      accuracy: record.accuracy,
      questionsCompleted: record.questionsCompleted,
      saved,
    });
  };

  const serialized = serializePayloads(
    nextHistory,
    nextAllTimeStats,
    prevHistory
  );
  if (serialized === null) {
    emitCompleted(false);
    return { ok: false, reason: "serialize-failed" };
  }

  const writeResult = persistSerialized(serialized);
  emitCompleted(writeResult.ok);
  if (writeResult.ok) {
    return { ok: true, summary };
  }
  return { ok: false, reason: writeResult.reason };
};

type SerializedPayloads = {
  nextHistoryStr: string;
  nextAllTimeStr: string;
  prevHistoryStr: string;
};

// Pre-serialize so a JSON.stringify failure surfaces before any write.
// Stringify can throw on circular refs or unserializable values (BigInt) —
// none of which are expected here, but treat defensively so a single bad
// input doesn't escape uncaught. Per F7/C4, GA reporting for failures lives
// upstream at the call sites (use-session.ts flush effect; use-session-auto-
// save.ts unmount path) where the operational context is available; the
// dev-only console.warn here is kept for local debugging.
const serializePayloads = (
  nextHistory: SessionRecord[],
  nextAllTimeStats: AllTimeStats,
  prevHistory: SessionRecord[]
): SerializedPayloads | null => {
  try {
    return {
      nextHistoryStr: JSON.stringify(nextHistory),
      nextAllTimeStr: JSON.stringify(nextAllTimeStats),
      prevHistoryStr: JSON.stringify(prevHistory),
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "[localStorage] Failed to serialize session payload:",
        error
      );
    }
    return null;
  }
};

// `localStorage.setItem` wrapper. Returns true on success, false on quota or
// other DOMException. Per F7/C4, GA reporting lives at the upstream callers
// that own operational context (see comment on `serializePayloads`).
const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[localStorage] Failed to write key "${key}":`, error);
    }
    return false;
  }
};

type PersistResult =
  | { ok: true }
  | { ok: false; reason: "write-failed" | "corrupt" };

// Writes history then all-time stats. On stats failure, rolls history back.
// If the rollback itself fails, the on-disk state is inconsistent and the
// caller is told via `reason: 'corrupt'` so it can surface that to the user
// (and emit a single GA event with operational context).
const persistSerialized = (serialized: SerializedPayloads): PersistResult => {
  if (!safeSetItem(SESSION_HISTORY_LSK, serialized.nextHistoryStr)) {
    return { ok: false, reason: "write-failed" };
  }

  if (safeSetItem(ALL_TIME_STATS_LSK, serialized.nextAllTimeStr)) {
    return { ok: true };
  }

  // All-time stats write failed — roll history back to its prior value.
  try {
    localStorage.setItem(SESSION_HISTORY_LSK, serialized.prevHistoryStr);
  } catch (rollbackError) {
    // Very unlikely: writing back a smaller-or-equal payload should not
    // exceed quota. Log so this is at least visible in production consoles.
    // GA reporting for the resulting `corrupt` state happens upstream in
    // use-session.ts (the flush effect) where the operational context is
    // known — keeping it here would cause double-counting (see C4).
    console.error(
      `[localStorage] Failed to roll back "${SESSION_HISTORY_LSK}":`,
      rollbackError
    );
    return { ok: false, reason: "corrupt" };
  }
  return { ok: false, reason: "write-failed" };
};
