import {
  ALL_TIME_STATS_LSK,
  MAX_SESSION_HISTORY,
  SESSION_HISTORY_LSK,
} from "../constants";
import { eventBus } from "../services/event-bus";
import type {
  ActiveSession,
  AllTimeStats,
  AllTimeStatsEntry,
  Encouragement,
  SessionRecord,
  SessionSummary,
} from "../types/session";
import { dispatchKeyChange, probeStoredValue } from "./localstorage";
import { clearLastSaveFailedBreadcrumbForSession } from "./session-breadcrumbs";
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
    accuracy: calculateAccuracy(session.successes, session.fails),
    bestStreak: session.bestStreak,
    config: session.config,
    durationSeconds,
    endedAt,
    fails: session.fails,
    id: session.id,
    questionsCompleted: session.questionsCompleted,
    stackKey: session.stackKey,
    stackLimits: session.stackLimits,
    startedAt: session.startedAt,
    successes: session.successes,
    timed: session.timed,
  };

  switch (session.mode) {
    case "flashcard":
      return {
        ...baseRecord,
        flashcardMode: session.flashcardMode,
        mode: "flashcard" as const,
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
        distanceConvention: session.distanceConvention,
        distanceMode: session.distanceMode,
        mode: "distance" as const,
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
    history: probe.status === "valid" ? probe.value : [],
    status: "ready",
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
    stats: probe.status === "valid" ? probe.value : {},
    status: "ready",
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
    encouragement,
    isAccuracyImprovement,
    isNewGlobalBestStreak,
    previousAverageAccuracy,
    record,
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
 * What a checkpoint save (`checkpointSession`) of a still-running session left
 * on disk. `record` is the record it wrote, so a later save of the same id adds
 * only what changed since then to the all-time stats. `baselineEntry` is the
 * stats entry from before the session's first save, so the end-of-session
 * summary still compares against the state the session started from.
 */
export type SessionCheckpoint = {
  record: SessionRecord;
  baselineEntry: AllTimeStatsEntry | undefined;
};

type CheckpointSessionResult =
  | { ok: true; checkpoint: SessionCheckpoint }
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
 * Upsert: a history entry with the same id is replaced, never duplicated.
 * When `checkpoint` is given (the session was saved earlier by
 * `checkpointSession`), the stats get only the difference since that save and
 * the session is not counted again. Without it, the record's full counts are
 * added even if its id is already in history, so a retry after a `corrupt`
 * failure (where history wrote but stats did not) repairs the stats. In-mount
 * retry safety lives upstream in `use-session.ts` via `finalizedIdsRef`.
 * Worst case is a cross-tab finalize-twice race that double-increments stats
 * by 1 for that record; strictly better than silently dropping the increment.
 *
 * Summary semantics: the summary compares the new record against the PREVIOUS
 * stats (pre-update), or against the checkpoint's baseline when there is one.
 *
 * SESSION_COMPLETED is emitted in both success and failure paths with a
 * `saved` flag so telemetry can distinguish completed-and-saved from
 * completed-but-quota-exceeded (`analytics.trackSessionCompleted` maps the
 * `saved=false` case to a `Save Failed` GA action).
 */
export const finalizeSession = (
  session: ActiveSession,
  checkpoint?: SessionCheckpoint
): FinalizeSessionResult => {
  const record = buildSessionRecord(session);
  const result = saveRecord(record, checkpoint);
  eventBus.emit.SESSION_COMPLETED({
    accuracy: record.accuracy,
    mode: record.mode,
    questionsCompleted: record.questionsCompleted,
    saved: result.ok,
  });
  if (!result.ok) {
    return result;
  }
  const key = statsKey(record.mode, record.stackKey);
  const summaryStats: AllTimeStats =
    checkpoint === undefined
      ? result.prevAllTimeStats
      : { ...result.prevAllTimeStats, [key]: checkpoint.baselineEntry };
  return {
    ok: true,
    summary: computeSessionSummary(record, result.prevHistory, summaryStats),
  };
};

/**
 * Saves a session that is still running (the page was hidden and may be
 * killed without another event) under its own id, with the same refusal,
 * rollback and upsert rules as `finalizeSession`. Emits no SESSION_COMPLETED:
 * the session has not ended. Pass the previous checkpoint of the same session
 * so its stats are not counted twice, and hand the returned one to the next
 * save of this session.
 */
export const checkpointSession = (
  session: ActiveSession,
  previous?: SessionCheckpoint
): CheckpointSessionResult => {
  const record = buildSessionRecord(session);
  const result = saveRecord(record, previous);
  if (!result.ok) {
    return result;
  }
  const baselineEntry =
    previous === undefined
      ? result.prevAllTimeStats[statsKey(record.mode, record.stackKey)]
      : previous.baselineEntry;
  return { checkpoint: { baselineEntry, record }, ok: true };
};

// Adds `record` to a stats entry. With `previous` (an earlier save of the same
// session), only what changed since then is added and the session is not
// counted again. Counts within a session only grow, so the deltas are >= 0.
const addRecordToStatsEntry = (
  entry: AllTimeStatsEntry | undefined,
  record: SessionRecord,
  previous: SessionRecord | undefined
): AllTimeStatsEntry => {
  const base = entry ?? createEmptyStatsEntry();
  return {
    globalBestStreak: Math.max(base.globalBestStreak, record.bestStreak),
    totalFails: base.totalFails + record.fails - (previous?.fails ?? 0),
    totalQuestions:
      base.totalQuestions +
      record.questionsCompleted -
      (previous?.questionsCompleted ?? 0),
    totalSessions: base.totalSessions + (previous === undefined ? 1 : 0),
    totalSuccesses:
      base.totalSuccesses + record.successes - (previous?.successes ?? 0),
  };
};

type SaveRecordResult =
  | { ok: true; prevHistory: SessionRecord[]; prevAllTimeStats: AllTimeStats }
  | { ok: false; reason: FinalizeFailureReason };

// Upserts `record` into history and adds it to the all-time stats, returning
// the state read before the write for the caller's summary or baseline.
const saveRecord = (
  record: SessionRecord,
  checkpoint: SessionCheckpoint | undefined
): SaveRecordResult => {
  // Refuse to overwrite corrupt prior state. If we collapsed corruption into
  // `[]`/`{}` here, the next write would prepend `record` onto the empty
  // default and the user would lose every prior session/stats irreversibly.
  // Surface as a distinct reason so the UI can offer a different recovery
  // path (clear storage, export-then-reset) instead of silently retrying.
  const historyProbe = probeSessionHistory();
  const statsProbe = probeAllTimeStats();
  if (historyProbe.status === "corrupt" || statsProbe.status === "corrupt") {
    return { ok: false, reason: "corrupt-prior-state" };
  }

  const prevHistory = historyProbe.history;
  const prevAllTimeStats = statsProbe.stats;

  // The record ended last, so it goes first; an earlier entry with its id
  // (a checkpoint, or a retry after a `corrupt` failure) is replaced.
  const nextHistory = [
    record,
    ...prevHistory.filter((r) => r.id !== record.id),
  ];
  if (nextHistory.length > MAX_SESSION_HISTORY) {
    nextHistory.length = MAX_SESSION_HISTORY;
  }

  const key = statsKey(record.mode, record.stackKey);
  const nextAllTimeStats: AllTimeStats = {
    ...prevAllTimeStats,
    [key]: addRecordToStatsEntry(
      prevAllTimeStats[key],
      record,
      checkpoint?.record
    ),
  };

  const serialized = serializePayloads(
    nextHistory,
    nextAllTimeStats,
    prevHistory
  );
  if (serialized === null) {
    return { ok: false, reason: "serialize-failed" };
  }

  const writeResult = persistSerialized(serialized);
  if (!writeResult.ok) {
    return writeResult;
  }
  // A failed save of this session on page hide left a breadcrumb; this save
  // supersedes it.
  clearLastSaveFailedBreadcrumbForSession(record.id);
  return { ok: true, prevAllTimeStats, prevHistory };
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
      nextAllTimeStr: JSON.stringify(nextAllTimeStats),
      nextHistoryStr: JSON.stringify(nextHistory),
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

// Tells same-tab `useLocalDb` subscribers (stats, discovery, share nudge, PWA
// install prompt) that `key` changed; the native `storage` event only reaches
// other tabs. The write has already persisted, so a throw here must not turn
// into a save failure, as in `useLocalDb`'s setter.
const announceKeyChange = (key: string): void => {
  try {
    dispatchKeyChange(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        `[localStorage] dispatchKeyChange threw for "${key}":`,
        error
      );
    }
  }
};

type PersistResult =
  | { ok: true }
  | { ok: false; reason: "write-failed" | "corrupt" };

// Writes history then all-time stats. On stats failure, rolls history back.
// If the rollback itself fails, the on-disk state is inconsistent and the
// caller is told via `reason: 'corrupt'` so it can surface that to the user
// (and emit a single GA event with operational context).
//
// Once the history write succeeds, every branch announces history: the
// rollback writes re-serialized bytes, which need not match what was there,
// and a failed rollback leaves the new history on disk. Stats are announced
// only when their write succeeded. Announcing after the writes settle means a
// subscriber never re-reads history ahead of the matching stats.
const persistSerialized = (serialized: SerializedPayloads): PersistResult => {
  if (!safeSetItem(SESSION_HISTORY_LSK, serialized.nextHistoryStr)) {
    return { ok: false, reason: "write-failed" };
  }

  if (safeSetItem(ALL_TIME_STATS_LSK, serialized.nextAllTimeStr)) {
    announceKeyChange(SESSION_HISTORY_LSK);
    announceKeyChange(ALL_TIME_STATS_LSK);
    return { ok: true };
  }

  // All-time stats write failed — roll history back to its prior value.
  try {
    localStorage.setItem(SESSION_HISTORY_LSK, serialized.prevHistoryStr);
  } catch (rollbackError) {
    // Very unlikely: writing back a smaller-or-equal payload should not
    // exceed quota. Log so this is at least visible in dev consoles.
    // GA reporting for the resulting `corrupt` state happens upstream in
    // use-session.ts (the flush effect) where the operational context is
    // known — keeping it here would cause double-counting (see C4).
    if (import.meta.env.DEV) {
      console.error(
        `[localStorage] Failed to roll back "${SESSION_HISTORY_LSK}":`,
        rollbackError
      );
    }
    announceKeyChange(SESSION_HISTORY_LSK);
    return { ok: false, reason: "corrupt" };
  }
  announceKeyChange(SESSION_HISTORY_LSK);
  return { ok: false, reason: "write-failed" };
};
