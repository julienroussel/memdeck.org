import type {
  ActiveSession,
  SessionRecord,
  SessionSummary,
} from "../types/session";

// `as SessionRecord` justified: spreading Partial over a discriminated union
// is a known TS limitation — the compiler cannot verify the variant after spread.
export const makeSessionRecord = (
  overrides: Partial<SessionRecord> = {}
): SessionRecord =>
  ({
    accuracy: 0.8,
    bestStreak: 5,
    config: { totalQuestions: 10, type: "structured" },
    durationSeconds: 300,
    endedAt: "2025-01-01T00:05:00.000Z",
    fails: 2,
    id: "test-id",
    mode: "flashcard",
    questionsCompleted: 10,
    stackKey: "mnemonica",
    startedAt: "2025-01-01T00:00:00.000Z",
    successes: 8,
    ...overrides,
  }) as SessionRecord;

// `as ActiveSession` justified: spreading Partial over a discriminated union
// is a known TS limitation — the compiler cannot verify the variant after spread.
export const makeActiveSession = (
  overrides: Partial<ActiveSession> = {}
): ActiveSession =>
  ({
    bestStreak: 0,
    config: { type: "open" },
    currentStreak: 0,
    fails: 0,
    flashcardMode: "bothmodes",
    id: "test-session",
    mode: "flashcard",
    questionsCompleted: 0,
    stackKey: "mnemonica",
    startedAt: "2025-01-01T00:00:00.000Z",
    successes: 0,
    timed: false,
    ...overrides,
  }) as ActiveSession;

// `as SessionSummary` justified: spreading Partial over a type containing a
// discriminated union (SessionRecord) is a known TS limitation — the compiler
// cannot verify the variant after spread.
export const makeSummary = (
  overrides: Partial<SessionSummary> = {}
): SessionSummary =>
  ({
    encouragement: { key: "session.encouragement.consistent" },
    isAccuracyImprovement: false,
    isNewGlobalBestStreak: false,
    previousAverageAccuracy: null,
    record: makeSessionRecord({
      config: { type: "open" },
      id: "test-record",
    }),
    ...overrides,
  }) as SessionSummary;
