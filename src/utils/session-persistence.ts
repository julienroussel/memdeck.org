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
import { getStoredValue } from "./localstorage";
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

  return {
    id: session.id,
    mode: session.mode,
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
  };
};

// --- Persistence ---

const readSessionHistory = (): SessionRecord[] =>
  getStoredValue<SessionRecord[]>(
    SESSION_HISTORY_LSK,
    [],
    isSessionRecordArray
  );

const writeSessionHistory = (records: SessionRecord[]) => {
  try {
    localStorage.setItem(SESSION_HISTORY_LSK, JSON.stringify(records));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        `[localStorage] Failed to write key "${SESSION_HISTORY_LSK}":`,
        error
      );
    }
  }
};

const readAllTimeStats = (): AllTimeStats =>
  getStoredValue<AllTimeStats>(ALL_TIME_STATS_LSK, {}, isAllTimeStats);

const writeAllTimeStats = (stats: AllTimeStats) => {
  try {
    localStorage.setItem(ALL_TIME_STATS_LSK, JSON.stringify(stats));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        `[localStorage] Failed to write key "${ALL_TIME_STATS_LSK}":`,
        error
      );
    }
  }
};

/** Persists a session record to localStorage (prepend, cap at MAX_SESSION_HISTORY) */
export const saveSessionRecord = (record: SessionRecord): void => {
  // Safe to mutate: readSessionHistory() returns a fresh array from JSON.parse (no shared references).
  const history = readSessionHistory();
  history.unshift(record);
  if (history.length > MAX_SESSION_HISTORY) {
    history.length = MAX_SESSION_HISTORY;
  }
  writeSessionHistory(history);
};

/** Updates the aggregated all-time stats in localStorage with a new session record */
export const updateAllTimeStats = (record: SessionRecord): void => {
  const stats = readAllTimeStats();
  const key = statsKey(record.mode, record.stackKey);
  const entry = stats[key] ?? createEmptyStatsEntry();

  stats[key] = {
    totalSessions: entry.totalSessions + 1,
    totalQuestions: entry.totalQuestions + record.questionsCompleted,
    totalSuccesses: entry.totalSuccesses + record.successes,
    totalFails: entry.totalFails + record.fails,
    globalBestStreak: Math.max(entry.globalBestStreak, record.bestStreak),
  };

  writeAllTimeStats(stats);
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

// Ordering is intentional: we save the record first, then read history for summary
// computation. This is safe because computeSessionSummary filters the just-saved
// record out of history by ID, so it won't be double-counted.
/** Finalizes an active session: persists it and returns a summary */
export const finalizeSession = (session: ActiveSession): SessionSummary => {
  const record = buildSessionRecord(session);
  saveSessionRecord(record);
  const history = readSessionHistory();
  const allTimeStats = readAllTimeStats();
  const summary = computeSessionSummary(record, history, allTimeStats);
  // Update all-time stats AFTER computing the summary so that "is this a new best?"
  // comparisons inside computeSessionSummary run against the previous stats.
  updateAllTimeStats(record);
  eventBus.emit.SESSION_COMPLETED({
    mode: record.mode,
    accuracy: record.accuracy,
    questionsCompleted: record.questionsCompleted,
  });
  return summary;
};
