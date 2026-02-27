import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_TIME_STATS_LSK,
  MAX_SESSION_HISTORY,
  SESSION_HISTORY_LSK,
} from "../constants";
import { eventBus } from "../services/event-bus";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import {
  makeActiveSession,
  makeSessionRecord as makeRecord,
} from "../test-utils/session-factories";
import type { AllTimeStats, SessionRecord } from "../types/session";
import {
  buildSessionRecord,
  computeSessionSummary,
  finalizeSession,
  saveSessionRecord,
  updateAllTimeStats,
} from "./session-persistence";

const { storage, mockLocalStorage } = createMockLocalStorage();

// Mock event bus so finalizeSession doesn't trigger real analytics
vi.mock("../services/event-bus", () => ({
  eventBus: {
    emit: { SESSION_COMPLETED: vi.fn() },
    subscribe: { SESSION_COMPLETED: vi.fn() },
  },
}));

// Mock @mantine/hooks so getStoredValue can work
vi.mock("@mantine/hooks", () => ({
  readLocalStorageValue: ({ key }: { key: string }) => {
    const raw = storage.get(key);
    if (raw === undefined || raw === null) {
      return undefined;
    }
    return JSON.parse(raw);
  },
  useLocalStorage: vi.fn(),
}));

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

const makeSession = (overrides: Parameters<typeof makeActiveSession>[0] = {}) =>
  makeActiveSession({
    id: "test-session-id",
    config: { type: "structured", totalQuestions: 10 },
    successes: 8,
    fails: 2,
    questionsCompleted: 10,
    currentStreak: 3,
    bestStreak: 5,
    ...overrides,
  });

beforeEach(() => {
  storage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildSessionRecord", () => {
  it("converts an active session to a session record", () => {
    const session = makeSession();
    const record = buildSessionRecord(session);

    expect(record.id).toBe(session.id);
    expect(record.mode).toBe(session.mode);
    expect(record.stackKey).toBe(session.stackKey);
    expect(record.successes).toBe(8);
    expect(record.fails).toBe(2);
    expect(record.questionsCompleted).toBe(10);
    expect(record.accuracy).toBe(0.8);
    expect(record.bestStreak).toBe(5);
    expect(record.endedAt).toBeDefined();
    expect(record.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it("calculates accuracy of 0 when no attempts", () => {
    const session = makeSession({ successes: 0, fails: 0 });
    const record = buildSessionRecord(session);
    expect(record.accuracy).toBe(0);
  });
});

describe("saveSessionRecord", () => {
  it("saves a record to localStorage", () => {
    const record = makeRecord();
    saveSessionRecord(record);

    const stored = JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(record.id);
  });

  it("prepends new records", () => {
    saveSessionRecord(makeRecord({ id: "first" }));
    saveSessionRecord(makeRecord({ id: "second" }));

    const stored = JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe("second");
    expect(stored[1].id).toBe("first");
  });

  it("caps history at MAX_SESSION_HISTORY", () => {
    const records: SessionRecord[] = [];
    for (let i = 0; i < MAX_SESSION_HISTORY; i++) {
      records.push(makeRecord({ id: `record-${i}` }));
    }
    storage.set(SESSION_HISTORY_LSK, JSON.stringify(records));

    saveSessionRecord(makeRecord({ id: "overflow" }));

    const stored = JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");
    expect(stored).toHaveLength(MAX_SESSION_HISTORY);
    expect(stored[0].id).toBe("overflow");
  });
});

describe("updateAllTimeStats", () => {
  it("creates a new entry for first session", () => {
    const record = makeRecord();
    updateAllTimeStats(record);

    const stored: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    const entry = stored["flashcard:mnemonica"];

    expect(entry).toBeDefined();
    expect(entry?.totalSessions).toBe(1);
    expect(entry?.totalQuestions).toBe(10);
    expect(entry?.totalSuccesses).toBe(8);
    expect(entry?.totalFails).toBe(2);
    expect(entry?.globalBestStreak).toBe(5);
  });

  it("accumulates stats across sessions", () => {
    updateAllTimeStats(makeRecord({ successes: 5, fails: 5, bestStreak: 3 }));
    updateAllTimeStats(makeRecord({ successes: 8, fails: 2, bestStreak: 7 }));

    const stored: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    const entry = stored["flashcard:mnemonica"];

    expect(entry?.totalSessions).toBe(2);
    expect(entry?.totalSuccesses).toBe(13);
    expect(entry?.totalFails).toBe(7);
    expect(entry?.globalBestStreak).toBe(7);
  });

  it("tracks best streak as max across sessions", () => {
    updateAllTimeStats(makeRecord({ bestStreak: 10 }));
    updateAllTimeStats(makeRecord({ bestStreak: 3 }));

    const stored: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    expect(stored["flashcard:mnemonica"]?.globalBestStreak).toBe(10);
  });
});

describe("computeSessionSummary", () => {
  const emptyStats: AllTimeStats = {};

  it("returns perfect encouragement key for 100% accuracy", () => {
    const record = makeRecord({ accuracy: 1, successes: 10, fails: 0 });
    const summary = computeSessionSummary(record, [], emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.perfect",
    });
  });

  it("returns great start key for first session in mode+stack", () => {
    const record = makeRecord({ accuracy: 0.7 });
    const summary = computeSessionSummary(record, [], emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.greatStart",
    });
    expect(summary.previousAverageAccuracy).toBeNull();
  });

  it("returns improvement key when accuracy exceeds rolling average", () => {
    const history = [
      makeRecord({ id: "old-1", accuracy: 0.5 }),
      makeRecord({ id: "old-2", accuracy: 0.6 }),
    ];

    const record = makeRecord({ id: "new", accuracy: 0.79, bestStreak: 0 });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.improvement",
    });
    expect(summary.isAccuracyImprovement).toBe(true);
  });

  it("returns new best streak key with params when applicable", () => {
    const history = [makeRecord({ id: "old-1", accuracy: 0.9 })];

    const allTimeStats: AllTimeStats = {
      "flashcard:mnemonica": {
        totalSessions: 1,
        totalQuestions: 10,
        totalSuccesses: 9,
        totalFails: 1,
        globalBestStreak: 5,
      },
    };

    const record = makeRecord({
      id: "new",
      accuracy: 0.7,
      bestStreak: 6,
    });
    const summary = computeSessionSummary(record, history, allTimeStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.newBestStreak",
      params: { count: 6 },
    });
    expect(summary.isNewGlobalBestStreak).toBe(true);
  });

  it("does not treat tying the global best streak as a new best", () => {
    const history = [makeRecord({ id: "old-1", accuracy: 0.9 })];

    const allTimeStats: AllTimeStats = {
      "flashcard:mnemonica": {
        totalSessions: 1,
        totalQuestions: 10,
        totalSuccesses: 9,
        totalFails: 1,
        globalBestStreak: 5,
      },
    };

    const record = makeRecord({
      id: "new",
      accuracy: 0.7,
      bestStreak: 5,
    });
    const summary = computeSessionSummary(record, history, allTimeStats);
    expect(summary.isNewGlobalBestStreak).toBe(false);
  });

  it("returns keepGoing key for low accuracy below 50%", () => {
    const history = [makeRecord({ id: "old-1", accuracy: 0.4 })];

    const record = makeRecord({
      id: "new",
      accuracy: 0.3,
      bestStreak: 0,
    });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.keepGoing",
    });
  });

  it("returns consistent key for high accuracy that does not exceed the rolling average", () => {
    const history = [makeRecord({ id: "old-1", accuracy: 0.9 })];
    const record = makeRecord({ id: "new", accuracy: 0.8, bestStreak: 0 });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.consistent",
    });
  });

  it("returns progress key for moderate accuracy between 50-80% that does not exceed the rolling average", () => {
    const history = [makeRecord({ id: "old-1", accuracy: 0.7 })];
    const record = makeRecord({ id: "new", accuracy: 0.5, bestStreak: 0 });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.progress",
    });
  });

  it("includes previousAverageAccuracy when history exists", () => {
    const history = [
      makeRecord({ id: "old-1", accuracy: 0.6 }),
      makeRecord({ id: "old-2", accuracy: 0.8 }),
    ];

    const record = makeRecord({ id: "new", accuracy: 0.5, bestStreak: 0 });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.previousAverageAccuracy).toBe(0.7);
  });
});

describe("finalizeSession", () => {
  it("returns a SessionSummary with the correct record", () => {
    const session = makeSession();
    const summary = finalizeSession(session);

    expect(summary.record.id).toBe(session.id);
    expect(summary.record.mode).toBe(session.mode);
    expect(summary.record.stackKey).toBe(session.stackKey);
    expect(summary.record.successes).toBe(8);
    expect(summary.record.fails).toBe(2);
    expect(summary.record.accuracy).toBe(0.8);
    expect(summary.record.bestStreak).toBe(5);

    expect(eventBus.emit.SESSION_COMPLETED).toHaveBeenCalledWith({
      mode: "flashcard",
      accuracy: 0.8,
      questionsCompleted: 10,
    });
  });

  it("saves the session record to localStorage", () => {
    const session = makeSession();
    finalizeSession(session);

    const stored = JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(session.id);
  });

  it("updates all-time stats for the session's stack", () => {
    const session = makeSession();
    finalizeSession(session);

    const stored: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    const entry = stored["flashcard:mnemonica"];

    expect(entry).toBeDefined();
    expect(entry?.totalSessions).toBe(1);
    expect(entry?.totalQuestions).toBe(10);
    expect(entry?.totalSuccesses).toBe(8);
    expect(entry?.totalFails).toBe(2);
    expect(entry?.globalBestStreak).toBe(5);
  });

  it("computes summary against previous stats so new-best comparisons use pre-update values", () => {
    // Seed all-time stats with a globalBestStreak of 3
    const existingStats: AllTimeStats = {
      "flashcard:mnemonica": {
        totalSessions: 1,
        totalQuestions: 10,
        totalSuccesses: 8,
        totalFails: 2,
        globalBestStreak: 3,
      },
    };
    storage.set(ALL_TIME_STATS_LSK, JSON.stringify(existingStats));

    // Seed history so there's a previous average accuracy
    const oldRecord = makeRecord({ id: "old", accuracy: 0.5, bestStreak: 3 });
    storage.set(SESSION_HISTORY_LSK, JSON.stringify([oldRecord]));

    // Finalize a session with bestStreak=5, which exceeds the old globalBestStreak of 3
    const session = makeSession({ id: "new-session", bestStreak: 5 });
    const summary = finalizeSession(session);

    // The summary should detect this as a new global best streak because
    // stats are updated AFTER summary computation
    expect(summary.isNewGlobalBestStreak).toBe(true);

    // After finalization, the stored stats should now reflect the updated streak
    const updatedStats: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    expect(updatedStats["flashcard:mnemonica"]?.globalBestStreak).toBe(5);
  });

  it("returns greatStart encouragement for first session with no history", () => {
    const session = makeSession({ successes: 7, fails: 3 });
    const summary = finalizeSession(session);

    expect(summary.encouragement).toEqual({
      key: "session.encouragement.greatStart",
    });
    expect(summary.previousAverageAccuracy).toBeNull();
  });

  it("does not fail when localStorage setItem throws", () => {
    const originalSetItem = mockLocalStorage.setItem;
    mockLocalStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };

    const session = makeSession();
    // Should not throw — errors are swallowed internally
    const summary = finalizeSession(session);

    expect(summary.record.id).toBe(session.id);

    mockLocalStorage.setItem = originalSetItem;
  });
});
