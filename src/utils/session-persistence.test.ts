import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_TIME_STATS_LSK, SESSION_HISTORY_LSK } from "../constants";
import { eventBus } from "../services/event-bus";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import {
  makeActiveSession,
  makeSessionRecord as makeRecord,
} from "../test-utils/session-factories";
import type { AllTimeStats } from "../types/session";
import { createDeckPosition } from "../types/stacks";
import {
  buildSessionRecord,
  computeSessionSummary,
  finalizeSession,
} from "./session-persistence";

const { storage, mockLocalStorage } = createMockLocalStorage();

// Mock event bus so finalizeSession doesn't trigger real analytics
vi.mock("../services/event-bus", () => ({
  eventBus: {
    emit: { SESSION_COMPLETED: vi.fn() },
    subscribe: { SESSION_COMPLETED: vi.fn() },
  },
}));

// Mock analytics so trackError doesn't try to talk to GA in tests
vi.mock("../services/analytics", () => ({
  analytics: {
    trackError: vi.fn(),
  },
}));

// Per-key read-error overrides for simulating Safari ITP / security failures
// during `localStorage.getItem`. Tests register a key here to make the mocked
// `readLocalStorageValue` throw for that key only.
const readErrorKeys = new Map<string, unknown>();

// Mock @mantine/hooks so getStoredValue can work
vi.mock("@mantine/hooks", () => ({
  readLocalStorageValue: ({ key }: { key: string }) => {
    if (readErrorKeys.has(key)) {
      throw readErrorKeys.get(key);
    }
    const raw = storage.get(key);
    if (raw === undefined || raw === null) {
      return;
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

const testStackLimits = {
  start: createDeckPosition(5),
  end: createDeckPosition(20),
};

beforeEach(() => {
  storage.clear();
  readErrorKeys.clear();
  vi.clearAllMocks();
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

  it("propagates stackLimits when present on the active session", () => {
    const session = makeSession({ stackLimits: testStackLimits });
    const record = buildSessionRecord(session);
    expect(record.stackLimits).toEqual({ start: 5, end: 20 });
  });

  it("leaves stackLimits undefined when not present on the active session", () => {
    const session = makeSession();
    const record = buildSessionRecord(session);
    expect(record.stackLimits).toBeUndefined();
  });

  it("propagates timed=true from the active session", () => {
    const session = makeSession({ timed: true });
    const record = buildSessionRecord(session);
    expect(record.timed).toBe(true);
  });

  it("propagates timed=false from the active session", () => {
    const session = makeSession({ timed: false });
    const record = buildSessionRecord(session);
    expect(record.timed).toBe(false);
  });

  it("returns a spotcheck record with the selected spot check mode", () => {
    const session = makeSession({
      mode: "spotcheck",
      spotCheckMode: "missing",
    });
    const record = buildSessionRecord(session);

    expect(record.mode).toBe("spotcheck");
    if (record.mode !== "spotcheck") {
      throw new Error("Expected spotcheck mode");
    }
    expect(record.spotCheckMode).toBe("missing");
    expect(record.stackKey).toBe("mnemonica");
    expect(typeof record.accuracy).toBe("number");
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
    const result = finalizeSession(session);

    if (!result.ok) {
      throw new Error("Expected finalizeSession to succeed");
    }
    const { summary } = result;
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
      saved: true,
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
    const result = finalizeSession(session);

    if (!result.ok) {
      throw new Error("Expected finalizeSession to succeed");
    }
    // The summary should detect this as a new global best streak because
    // stats are updated AFTER summary computation
    expect(result.summary.isNewGlobalBestStreak).toBe(true);

    // After finalization, the stored stats should now reflect the updated streak
    const updatedStats: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    expect(updatedStats["flashcard:mnemonica"]?.globalBestStreak).toBe(5);
  });

  it("returns greatStart encouragement for first session with no history", () => {
    const session = makeSession({ successes: 7, fails: 3 });
    const result = finalizeSession(session);

    if (!result.ok) {
      throw new Error("Expected finalizeSession to succeed");
    }
    expect(result.summary.encouragement).toEqual({
      key: "session.encouragement.greatStart",
    });
    expect(result.summary.previousAverageAccuracy).toBeNull();
  });

  it("finalizes a spotcheck session with the correct mode and spotCheckMode", () => {
    const session = makeSession({
      mode: "spotcheck",
      spotCheckMode: "swapped",
    });
    const result = finalizeSession(session);

    if (!result.ok) {
      throw new Error("Expected finalizeSession to succeed");
    }
    const { summary } = result;
    expect(summary.record.mode).toBe("spotcheck");
    if (summary.record.mode !== "spotcheck") {
      throw new Error("Expected spotcheck mode");
    }
    expect(summary.record.spotCheckMode).toBe("swapped");

    const stored = JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");
    expect(stored[0].mode).toBe("spotcheck");
    expect(stored[0].spotCheckMode).toBe("swapped");

    const stats: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    expect(stats["spotcheck:mnemonica"]).toBeDefined();
  });

  it("returns { ok: false, reason: 'write-failed' } when localStorage setItem throws", () => {
    const originalSetItem = mockLocalStorage.setItem;
    mockLocalStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };

    const session = makeSession();
    // Should not throw — errors are swallowed internally and surfaced via the
    // discriminated result.
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "write-failed" });

    mockLocalStorage.setItem = originalSetItem;
  });

  it("returns { ok: false, reason: 'corrupt' } when the rollback write also fails", () => {
    // Seed a valid history so finalizeSession proceeds past the dedupe check.
    const seed = makeRecord({ id: "seed" });
    storage.set(SESSION_HISTORY_LSK, JSON.stringify([seed]));

    // Fail only the all-time stats write AND the rollback write (both target
    // setItem). Sequence: history write succeeds, all-time stats write fails,
    // rollback write fails — leaving on-disk state inconsistent.
    let callCount = 0;
    const originalSetItem = mockLocalStorage.setItem;
    mockLocalStorage.setItem = (key: string, value: string) => {
      callCount++;
      if (callCount === 1) {
        // First setItem: history write — let it through.
        originalSetItem.call(mockLocalStorage, key, value);
        return;
      }
      // Second + third setItem (all-time stats, then rollback) both fail.
      throw new Error("QuotaExceededError");
    };

    const session = makeSession();
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "corrupt" });

    mockLocalStorage.setItem = originalSetItem;
  });

  // `serializePayloads` calls JSON.stringify three times in a single try block,
  // in this order: (1) nextHistory, (2) nextAllTimeStats, (3) prevHistory. Each
  // variant must surface as `serialize-failed` regardless of which call throws.
  it.each([
    { failingCall: 1, label: "nextHistory" },
    { failingCall: 2, label: "nextAllTimeStats" },
    { failingCall: 3, label: "prevHistory" },
  ])("returns { ok: false, reason: 'serialize-failed' } when JSON.stringify throws on call $failingCall ($label)", ({
    failingCall,
  }) => {
    // serialize-failed is distinct from write-failed so triage can split a
    // bad payload (cyclic ref, BigInt) from a quota or permissions issue.
    const originalStringify = JSON.stringify;
    let callCount = 0;
    const stringifySpy = vi
      .spyOn(JSON, "stringify")
      .mockImplementation((value, replacer, space) => {
        callCount++;
        if (callCount === failingCall) {
          throw new TypeError("circular reference");
        }
        return originalStringify(value, replacer, space);
      });

    const session = makeSession();
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "serialize-failed" });

    stringifySpy.mockRestore();
  });

  it("returns { ok: false, reason: 'corrupt-prior-state' } and refuses to overwrite when stored history fails validation", () => {
    // Simulate corrupt prior history (e.g. partial write or schema drift after
    // an app update). finalizeSession must refuse to overwrite — otherwise the
    // user's previously-recoverable history would be silently destroyed by a
    // single new record.
    storage.set(
      SESSION_HISTORY_LSK,
      JSON.stringify([{ totally: "not", a: "session", record: true }])
    );

    const session = makeSession();
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "corrupt-prior-state" });

    // Importantly, the history was NOT overwritten — the corrupt blob is still
    // present so the user can attempt manual recovery (export, repair, etc.).
    expect(storage.get(SESSION_HISTORY_LSK)).toBe(
      JSON.stringify([{ totally: "not", a: "session", record: true }])
    );
    // Stats must also be untouched.
    expect(storage.get(ALL_TIME_STATS_LSK)).toBeUndefined();
  });

  it("returns { ok: false, reason: 'corrupt-prior-state' } when stored all-time stats fail validation", () => {
    // History is fine but stats are corrupt — same refusal applies.
    storage.set(SESSION_HISTORY_LSK, JSON.stringify([]));
    storage.set(
      ALL_TIME_STATS_LSK,
      JSON.stringify({ "flashcard:mnemonica": "not an entry shape" })
    );

    const session = makeSession();
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "corrupt-prior-state" });

    // Neither key was overwritten.
    expect(storage.get(SESSION_HISTORY_LSK)).toBe(JSON.stringify([]));
    expect(storage.get(ALL_TIME_STATS_LSK)).toBe(
      JSON.stringify({ "flashcard:mnemonica": "not an entry shape" })
    );
  });

  it("repairs stats on retry after a prior 'corrupt' failure (history written, stats failed, rollback failed)", () => {
    // Simulate the on-disk state left behind by a corrupt finalize:
    // history was successfully written (record at position 0) but the
    // all-time stats write failed AND the history rollback also failed,
    // so stats are missing for this stack. The record's id sits in
    // history[0] but stats have no entry.
    const session = makeSession();
    const record = {
      // Build the same record finalizeSession would produce. Date fields are
      // overridden inside buildSessionRecord, but the dedupe check only
      // compares ids, so the seed shape just needs the id to match.
      ...makeRecord({ id: session.id, accuracy: 0.8 }),
    };
    storage.set(SESSION_HISTORY_LSK, JSON.stringify([record]));
    // Stats intentionally absent — this is the "corrupt" inconsistency.

    const result = finalizeSession(session);

    if (!result.ok) {
      throw new Error(
        "Expected retry after corrupt failure to succeed, got: " +
          JSON.stringify(result)
      );
    }

    // History must NOT have been duplicated — still a single entry with the
    // same id.
    const storedHistory = JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");
    expect(storedHistory).toHaveLength(1);
    expect(storedHistory[0].id).toBe(session.id);

    // Stats must now exist and reflect a single session — the retry repaired
    // the inconsistency rather than short-circuiting on dedupe.
    const stats: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    const entry = stats["flashcard:mnemonica"];
    expect(entry).toBeDefined();
    expect(entry?.totalSessions).toBe(1);
    expect(entry?.totalSuccesses).toBe(8);
    expect(entry?.totalFails).toBe(2);
  });

  it("returns { ok: false, reason: 'corrupt-prior-state' } when the history read throws (Safari ITP / security error)", () => {
    // A transient `localStorage.getItem` failure (Safari ITP, SecurityError,
    // quota during read) is indistinguishable from intact-data-we-can't-read.
    // Refusing to overwrite is the safe default — otherwise the next write
    // would silently destroy data the user might still recover.
    readErrorKeys.set(
      SESSION_HISTORY_LSK,
      new Error("SecurityError: ITP read denied")
    );

    const session = makeSession();
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "corrupt-prior-state" });

    // Nothing was written.
    expect(storage.get(SESSION_HISTORY_LSK)).toBeUndefined();
    expect(storage.get(ALL_TIME_STATS_LSK)).toBeUndefined();
  });

  it("returns { ok: false, reason: 'corrupt-prior-state' } when the all-time stats read throws", () => {
    storage.set(SESSION_HISTORY_LSK, JSON.stringify([]));
    readErrorKeys.set(
      ALL_TIME_STATS_LSK,
      new Error("SecurityError: ITP read denied")
    );

    const session = makeSession();
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "corrupt-prior-state" });

    // History was not overwritten beyond the seeded empty array.
    expect(storage.get(SESSION_HISTORY_LSK)).toBe(JSON.stringify([]));
    expect(storage.get(ALL_TIME_STATS_LSK)).toBeUndefined();
  });

  it("does not duplicate the history entry when the same session is finalized twice (history-level dedupe only)", () => {
    // Per-record dedupe at the persistence layer was removed (it relied on a
    // heuristic that conflated 'any prior session in this mode+stack' with
    // 'this specific record persisted', causing silent stats loss on retry
    // after a `corrupt` failure when the user already had prior sessions in
    // the same bucket). In-mount retry safety lives upstream in
    // `finalizedIdsRef` (use-session.ts). Here we only guarantee that history
    // isn't duplicated. The cross-tab finalize-twice race may double-increment
    // stats by 1 — accepted as strictly better than silent loss.
    const session = makeSession();
    const first = finalizeSession(session);
    if (!first.ok) {
      throw new Error("Expected first finalizeSession to succeed");
    }

    const second = finalizeSession(session);
    if (!second.ok) {
      throw new Error("Expected second finalizeSession to succeed");
    }

    // History must contain a single entry with the same id — not duplicated.
    const stored = JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(session.id);

    // Stats, however, are incremented on every successful finalize call —
    // there's no per-record stats dedupe at this layer. Two finalize calls for
    // the same session means totalSessions=2 (and the per-attempt counts also
    // doubled). This is the documented "double-increment on retry" tradeoff:
    // strictly better than silently dropping the stats increment when a prior
    // `corrupt` failure left history written but stats unwritten.
    const stats: AllTimeStats = JSON.parse(
      storage.get(ALL_TIME_STATS_LSK) ?? "{}"
    );
    const entry = stats["flashcard:mnemonica"];
    expect(entry).toBeDefined();
    expect(entry?.totalSessions).toBe(2);
    expect(entry?.totalQuestions).toBe(20);
    expect(entry?.totalSuccesses).toBe(16);
    expect(entry?.totalFails).toBe(4);
    expect(entry?.globalBestStreak).toBe(5);
  });
});
