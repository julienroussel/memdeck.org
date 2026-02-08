import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_TIME_STATS_LSK,
  MAX_SESSION_HISTORY,
  SESSION_HISTORY_LSK,
} from "../constants";
import type {
  ActiveSession,
  AllTimeStats,
  AllTimeStatsEntry,
  SessionRecord,
} from "../types/session";
import {
  aggregateStatsEntries,
  buildSessionRecord,
  calculateAccuracy,
  computeSessionSummary,
  createEmptyStatsEntry,
  formatDuration,
  isAllTimeStats,
  isSessionRecord,
  isSessionRecordArray,
  saveSessionRecord,
  statsKey,
  toAccuracyPercent,
  updateAllTimeStats,
} from "./session";

describe("toAccuracyPercent", () => {
  it("converts 0 to 0", () => {
    expect(toAccuracyPercent(0)).toBe(0);
  });

  it("converts 1 to 100", () => {
    expect(toAccuracyPercent(1)).toBe(100);
  });

  it("converts 0.8 to 80", () => {
    expect(toAccuracyPercent(0.8)).toBe(80);
  });

  it("rounds to the nearest integer", () => {
    expect(toAccuracyPercent(0.755)).toBe(76);
    expect(toAccuracyPercent(0.754)).toBe(75);
  });

  it("handles very small decimals", () => {
    expect(toAccuracyPercent(0.001)).toBe(0);
    expect(toAccuracyPercent(0.005)).toBe(1);
  });
});

describe("formatDuration", () => {
  it("returns '0s' for 0 seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("returns seconds only when under a minute", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("returns minutes and zero seconds for exact minutes", () => {
    expect(formatDuration(120)).toBe("2m 0s");
  });

  it("returns minutes and seconds for mixed durations", () => {
    expect(formatDuration(150)).toBe("2m 30s");
  });

  it("rounds fractional seconds", () => {
    expect(formatDuration(150.7)).toBe("2m 31s");
  });

  it("normalizes 59.5 seconds to 1m 0s", () => {
    expect(formatDuration(59.5)).toBe("1m 0s");
  });
});

// Mock localStorage for node test environment
const storage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (_index: number) => null,
};

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

const makeRecord = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
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

const makeSession = (
  overrides: Partial<ActiveSession> = {}
): ActiveSession => ({
  id: "test-session-id",
  mode: "flashcard",
  stackKey: "mnemonica",
  config: { type: "structured", totalQuestions: 10 },
  startedAt: "2025-01-01T00:00:00.000Z",
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

describe("statsKey", () => {
  it("builds a composite key from mode and stackKey", () => {
    expect(statsKey("flashcard", "mnemonica")).toBe("flashcard:mnemonica");
  });

  it("handles different modes and stacks", () => {
    expect(statsKey("acaan", "aronson")).toBe("acaan:aronson");
  });
});

describe("calculateAccuracy", () => {
  it("returns 0 when no attempts", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it("returns 1 for all successes", () => {
    expect(calculateAccuracy(10, 0)).toBe(1);
  });

  it("returns 0 for all fails", () => {
    expect(calculateAccuracy(0, 10)).toBe(0);
  });

  it("calculates correct ratio", () => {
    expect(calculateAccuracy(3, 1)).toBe(0.75);
  });
});

describe("createEmptyStatsEntry", () => {
  it("returns zeroed-out entry", () => {
    const entry = createEmptyStatsEntry();
    expect(entry).toEqual({
      totalSessions: 0,
      totalQuestions: 0,
      totalSuccesses: 0,
      totalFails: 0,
      globalBestStreak: 0,
    });
  });
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

describe("isSessionRecord", () => {
  it("returns true for valid session record", () => {
    expect(isSessionRecord(makeRecord())).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSessionRecord(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isSessionRecord("string")).toBe(false);
  });

  it("returns false for missing fields", () => {
    expect(isSessionRecord({ id: "test" })).toBe(false);
  });

  it("returns false when config has an invalid type", () => {
    const { config: _, ...withoutConfig } = makeRecord();
    const withBadConfig = { ...withoutConfig, config: { type: "invalid" } };
    expect(isSessionRecord(withBadConfig)).toBe(false);
  });

  it("returns false when config is missing entirely", () => {
    const { config: _, ...withoutConfig } = makeRecord();
    expect(isSessionRecord(withoutConfig)).toBe(false);
  });

  it("returns true for a valid open config", () => {
    expect(isSessionRecord(makeRecord({ config: { type: "open" } }))).toBe(
      true
    );
  });

  it("returns false for an invalid mode value", () => {
    const invalidModeRecord = { ...makeRecord(), mode: "invalid" };
    expect(isSessionRecord(invalidModeRecord)).toBe(false);
  });
});

describe("isSessionRecordArray", () => {
  it("returns true for empty array", () => {
    expect(isSessionRecordArray([])).toBe(true);
  });

  it("returns true for array of valid records", () => {
    expect(isSessionRecordArray([makeRecord(), makeRecord()])).toBe(true);
  });

  it("returns false for non-array", () => {
    expect(isSessionRecordArray("not array")).toBe(false);
  });

  it("returns false for array with invalid elements", () => {
    expect(isSessionRecordArray([{ invalid: true }])).toBe(false);
  });
});

describe("isAllTimeStats", () => {
  it("returns true for empty object", () => {
    expect(isAllTimeStats({})).toBe(true);
  });

  it("returns true for valid stats", () => {
    const stats: AllTimeStats = {
      "flashcard:mnemonica": createEmptyStatsEntry(),
    };
    expect(isAllTimeStats(stats)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isAllTimeStats(null)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isAllTimeStats([])).toBe(false);
  });

  it("returns false for invalid entries", () => {
    expect(isAllTimeStats({ key: "not an entry" })).toBe(false);
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
    expect(entry.totalSessions).toBe(1);
    expect(entry.totalQuestions).toBe(10);
    expect(entry.totalSuccesses).toBe(8);
    expect(entry.totalFails).toBe(2);
    expect(entry.globalBestStreak).toBe(5);
  });

  it("accumulates stats across sessions", () => {
    updateAllTimeStats(makeRecord({ successes: 5, fails: 5, bestStreak: 3 }));
    updateAllTimeStats(makeRecord({ successes: 8, fails: 2, bestStreak: 7 }));

    const stored: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    const entry = stored["flashcard:mnemonica"];

    expect(entry.totalSessions).toBe(2);
    expect(entry.totalSuccesses).toBe(13);
    expect(entry.totalFails).toBe(7);
    expect(entry.globalBestStreak).toBe(7);
  });

  it("tracks best streak as max across sessions", () => {
    updateAllTimeStats(makeRecord({ bestStreak: 10 }));
    updateAllTimeStats(makeRecord({ bestStreak: 3 }));

    const stored: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    expect(stored["flashcard:mnemonica"].globalBestStreak).toBe(10);
  });
});

describe("aggregateStatsEntries", () => {
  it("returns zeroed entry for empty array", () => {
    expect(aggregateStatsEntries([])).toEqual(createEmptyStatsEntry());
  });

  it("sums multiple entries", () => {
    const entries: AllTimeStatsEntry[] = [
      {
        totalSessions: 5,
        totalQuestions: 50,
        totalSuccesses: 40,
        totalFails: 10,
        globalBestStreak: 8,
      },
      {
        totalSessions: 3,
        totalQuestions: 30,
        totalSuccesses: 20,
        totalFails: 10,
        globalBestStreak: 12,
      },
    ];

    const result = aggregateStatsEntries(entries);

    expect(result.totalSessions).toBe(8);
    expect(result.totalQuestions).toBe(80);
    expect(result.totalSuccesses).toBe(60);
    expect(result.totalFails).toBe(20);
    expect(result.globalBestStreak).toBe(12);
  });
});

describe("computeSessionSummary", () => {
  const emptyStats: AllTimeStats = {};

  it("returns 'Perfect session!' for 100% accuracy", () => {
    const record = makeRecord({ accuracy: 1, successes: 10, fails: 0 });
    const summary = computeSessionSummary(record, [], emptyStats);
    expect(summary.encouragement).toBe("Perfect session!");
  });

  it("returns 'Great start!' for first session in mode+stack", () => {
    const record = makeRecord({ accuracy: 0.7 });
    const summary = computeSessionSummary(record, [], emptyStats);
    expect(summary.encouragement).toBe("Great start!");
    expect(summary.previousAverageAccuracy).toBeNull();
  });

  it("returns improvement message when accuracy exceeds rolling average", () => {
    const history = [
      makeRecord({ id: "old-1", accuracy: 0.5 }),
      makeRecord({ id: "old-2", accuracy: 0.6 }),
    ];

    const record = makeRecord({ id: "new", accuracy: 0.79, bestStreak: 0 });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toBe(
      "Great improvement! Your accuracy is trending up."
    );
    expect(summary.isAccuracyImprovement).toBe(true);
  });

  it("returns new best streak message when applicable", () => {
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
    expect(summary.encouragement).toBe("New personal best streak of 6!");
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

  it("returns low-accuracy encouragement below 50%", () => {
    const history = [makeRecord({ id: "old-1", accuracy: 0.4 })];

    const record = makeRecord({
      id: "new",
      accuracy: 0.3,
      bestStreak: 0,
    });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toBe(
      "Every session builds your memory. Keep at it!"
    );
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
