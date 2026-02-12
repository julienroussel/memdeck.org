import {
  ALL_TIME_STATS_LSK,
  MAX_SESSION_HISTORY,
  SESSION_HISTORY_LSK,
} from "../constants";
import { eventBus } from "../services/event-bus";
import {
  type ActiveSession,
  type AllTimeStats,
  type AllTimeStatsEntry,
  type AnswerOutcome,
  type Encouragement,
  type SessionConfig,
  type SessionPhase,
  type SessionRecord,
  type SessionSummary,
  type StatsKey,
  TRAINING_MODES,
  type TrainingMode,
} from "../types/session";
import { type StackKey, stacks } from "../types/stacks";
import { includes } from "./includes";
import { getStoredValue } from "./localstorage";

const VALID_STACK_KEYS: ReadonlySet<string> = new Set(Object.keys(stacks));
const VALID_TRAINING_MODES: ReadonlySet<string> = new Set(TRAINING_MODES);

/** Formats a duration in seconds to a human-readable string (e.g. "2m 30s") */
export const formatDuration = (seconds: number): string => {
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

/** Builds a composite key for AllTimeStats lookups */
export const statsKey = (mode: TrainingMode, stackKey: StackKey): StatsKey =>
  `${mode}:${stackKey}`;

/**
 * Parses a validated StatsKey into its constituent mode and stackKey components.
 *
 * Assumes the input has already been validated via `isStatsKey()` (or constructed
 * via `statsKey()`). The internal `as` casts on the sliced substrings are safe
 * because the branded StatsKey type guarantees the format `"{TrainingMode}:{StackKey}"`.
 */
export const parseStatsKey = (
  key: StatsKey
): { mode: TrainingMode; stackKey: StackKey } => {
  const separatorIndex = key.indexOf(":");
  return {
    mode: key.slice(0, separatorIndex) as TrainingMode,
    stackKey: key.slice(separatorIndex + 1) as StackKey,
  };
};

/** Calculates accuracy as a 0-1 decimal. Returns 0 when no attempts. */
export const calculateAccuracy = (successes: number, fails: number): number => {
  const total = successes + fails;
  if (total === 0) {
    return 0;
  }
  return successes / total;
};

/** Converts a 0-1 accuracy decimal to a rounded integer percentage */
export const toAccuracyPercent = (accuracy: number): number =>
  Math.round(accuracy * 100);

/** Creates a zeroed-out AllTimeStatsEntry */
export const createEmptyStatsEntry = (): AllTimeStatsEntry => ({
  totalSessions: 0,
  totalQuestions: 0,
  totalSuccesses: 0,
  totalFails: 0,
  globalBestStreak: 0,
});

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

// --- Type guards ---

const isSessionConfig = (value: unknown): value is SessionConfig => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("type" in value)) {
    return false;
  }
  if (value.type === "open") {
    return true;
  }
  // totalQuestions is checked as `number` (not against SESSION_PRESETS) for
  // localStorage resilience — old data may contain presets that no longer exist.
  return (
    value.type === "structured" &&
    "totalQuestions" in value &&
    typeof value.totalQuestions === "number"
  );
};

export const isSessionRecord = (value: unknown): value is SessionRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (
    !(
      "id" in value &&
      "mode" in value &&
      "stackKey" in value &&
      "config" in value &&
      "startedAt" in value &&
      "endedAt" in value &&
      "durationSeconds" in value &&
      "successes" in value &&
      "fails" in value &&
      "questionsCompleted" in value &&
      "accuracy" in value &&
      "bestStreak" in value
    )
  ) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.mode === "string" &&
    includes(TRAINING_MODES, value.mode) &&
    typeof value.stackKey === "string" &&
    isSessionConfig(value.config) &&
    typeof value.startedAt === "string" &&
    typeof value.endedAt === "string" &&
    typeof value.durationSeconds === "number" &&
    typeof value.successes === "number" &&
    typeof value.fails === "number" &&
    typeof value.questionsCompleted === "number" &&
    typeof value.accuracy === "number" &&
    typeof value.bestStreak === "number"
  );
};

export const isSessionRecordArray = (
  value: unknown
): value is SessionRecord[] =>
  Array.isArray(value) && value.every(isSessionRecord);

/** Validates that a string matches the `{TrainingMode}:{StackKey}` format */
export const isStatsKey = (key: string): key is StatsKey => {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex === -1) {
    return false;
  }
  const mode = key.slice(0, separatorIndex);
  const stack = key.slice(separatorIndex + 1);
  return VALID_TRAINING_MODES.has(mode) && VALID_STACK_KEYS.has(stack);
};

export const isAllTimeStats = (value: unknown): value is AllTimeStats => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.entries(record).every(([key, entry]) => {
    if (!isStatsKey(key)) {
      return false;
    }
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    if (
      !(
        "totalSessions" in entry &&
        "totalQuestions" in entry &&
        "totalSuccesses" in entry &&
        "totalFails" in entry &&
        "globalBestStreak" in entry
      )
    ) {
      return false;
    }
    return (
      typeof entry.totalSessions === "number" &&
      typeof entry.totalQuestions === "number" &&
      typeof entry.totalSuccesses === "number" &&
      typeof entry.totalFails === "number" &&
      typeof entry.globalBestStreak === "number"
    );
  });
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

/** Sums multiple AllTimeStatsEntry objects into a single aggregate */
export const aggregateStatsEntries = (
  entries: AllTimeStatsEntry[]
): AllTimeStatsEntry => {
  const result = createEmptyStatsEntry();
  for (const entry of entries) {
    result.totalSessions += entry.totalSessions;
    result.totalQuestions += entry.totalQuestions;
    result.totalSuccesses += entry.totalSuccesses;
    result.totalFails += entry.totalFails;
    result.globalBestStreak = Math.max(
      result.globalBestStreak,
      entry.globalBestStreak
    );
  }
  return result;
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

// --- Session phase helpers (extracted from useSession hook) ---

/** Extracts the active session from the session phase, or null if not active */
export const deriveActiveSession = (
  status: SessionPhase
): ActiveSession | null => (status.phase === "active" ? status.session : null);

/** Determines whether the current session is a structured (finite) session */
export const deriveIsStructuredSession = (
  activeSession: ActiveSession | null
): boolean =>
  activeSession !== null && activeSession.config.type === "structured";

/** Routes an answer outcome to the appropriate recording callbacks */
export const applyAnswerOutcome = (
  outcome: AnswerOutcome,
  callbacks: {
    recordCorrect: () => void;
    recordIncorrect: () => void;
    recordQuestionAdvanced: () => void;
  }
): void => {
  if (outcome.correct) {
    callbacks.recordCorrect();
  } else {
    callbacks.recordIncorrect();
  }
  if (outcome.questionAdvanced) {
    callbacks.recordQuestionAdvanced();
  }
};

/** Returns true if the session has enough questions to be worth persisting */
export const meetsMinimumSaveThreshold = (session: ActiveSession): boolean => {
  if (session.config.type === "structured") {
    return session.questionsCompleted > 0;
  }
  // Open sessions require at least 3 questions to avoid cluttering history
  // with micro-sessions from briefly visiting a page
  return session.questionsCompleted >= 3;
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
