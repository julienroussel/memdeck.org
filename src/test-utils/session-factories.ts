import type {
  ActiveSession,
  SessionRecord,
  SessionSummary,
} from "../types/session";

export const makeSessionRecord = (
  overrides: Partial<SessionRecord> = {}
): SessionRecord => ({
  id: "test-id",
  mode: "flashcard",
  stackKey: "mnemonica",
  config: { type: "structured", totalQuestions: 10 },
  startedAt: "2025-01-01T00:00:00.000Z",
  endedAt: "2025-01-01T00:05:00.000Z",
  durationSeconds: 300,
  successes: 8,
  fails: 2,
  questionsCompleted: 10,
  accuracy: 0.8,
  bestStreak: 5,
  ...overrides,
});

export const makeActiveSession = (
  overrides: Partial<ActiveSession> = {}
): ActiveSession => ({
  id: "test-session",
  mode: "flashcard",
  stackKey: "mnemonica",
  config: { type: "open" },
  startedAt: "2025-01-01T00:00:00.000Z",
  successes: 0,
  fails: 0,
  questionsCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  ...overrides,
});

export const makeSummary = (
  overrides: Partial<SessionSummary> = {}
): SessionSummary => ({
  record: {
    id: "test-record",
    mode: "flashcard",
    stackKey: "mnemonica",
    config: { type: "open" },
    startedAt: "2025-01-01T00:00:00.000Z",
    endedAt: "2025-01-01T00:05:00.000Z",
    durationSeconds: 300,
    successes: 8,
    fails: 2,
    questionsCompleted: 10,
    accuracy: 0.8,
    bestStreak: 5,
  },
  encouragement: { key: "session.encouragement.consistent" },
  isAccuracyImprovement: false,
  isNewGlobalBestStreak: false,
  previousAverageAccuracy: null,
  ...overrides,
});
