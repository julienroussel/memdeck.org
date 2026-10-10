import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_TIME_STATS_LSK,
  LAST_SAVE_FAILED_LSK,
  SESSION_HISTORY_LSK,
} from "../constants";
import { eventBus } from "../services/event-bus";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import {
  makeActiveSession,
  makeSessionRecord as makeRecord,
} from "../test-utils/session-factories";
import type { AllTimeStats, SessionRecord } from "../types/session";
import { createDeckPosition } from "../types/stacks";
import { useLocalDb } from "./localstorage";
import { writeLastSaveFailedBreadcrumb } from "./session-breadcrumbs";
import {
  buildSessionRecord,
  checkpointSession,
  computeSessionSummary,
  finalizeSession,
  type SessionCheckpoint,
} from "./session-persistence";
import { isAllTimeStats, isSessionRecordArray } from "./session-typeguards";

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
// during `localStorage.getItem`. Tests register a key here to make
// `localStorage.getItem` throw for that key only, which the real
// `probeStoredValue` must surface as `read-error`.
const readErrorKeys = new Map<string, unknown>();

mockLocalStorage.getItem = (key: string) => {
  if (readErrorKeys.has(key)) {
    throw readErrorKeys.get(key);
  }
  return storage.get(key) ?? null;
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

const makeSession = (overrides: Parameters<typeof makeActiveSession>[0] = {}) =>
  makeActiveSession({
    bestStreak: 5,
    config: { totalQuestions: 10, type: "structured" },
    currentStreak: 3,
    fails: 2,
    id: "test-session-id",
    questionsCompleted: 10,
    successes: 8,
    ...overrides,
  });

const testStackLimits = {
  end: createDeckPosition(20),
  start: createDeckPosition(5),
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
    const session = makeSession({ fails: 0, successes: 0 });
    const record = buildSessionRecord(session);
    expect(record.accuracy).toBe(0);
  });

  it("propagates stackLimits when present on the active session", () => {
    const session = makeSession({ stackLimits: testStackLimits });
    const record = buildSessionRecord(session);
    expect(record.stackLimits).toEqual({ end: 20, start: 5 });
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
    const record = makeRecord({ accuracy: 1, fails: 0, successes: 10 });
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
      makeRecord({ accuracy: 0.5, id: "old-1" }),
      makeRecord({ accuracy: 0.6, id: "old-2" }),
    ];

    const record = makeRecord({ accuracy: 0.79, bestStreak: 0, id: "new" });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.improvement",
    });
    expect(summary.isAccuracyImprovement).toBe(true);
  });

  it("returns new best streak key with params when applicable", () => {
    const history = [makeRecord({ accuracy: 0.9, id: "old-1" })];

    const allTimeStats: AllTimeStats = {
      "flashcard:mnemonica": {
        globalBestStreak: 5,
        totalFails: 1,
        totalQuestions: 10,
        totalSessions: 1,
        totalSuccesses: 9,
      },
    };

    const record = makeRecord({
      accuracy: 0.7,
      bestStreak: 6,
      id: "new",
    });
    const summary = computeSessionSummary(record, history, allTimeStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.newBestStreak",
      params: { count: 6 },
    });
    expect(summary.isNewGlobalBestStreak).toBe(true);
  });

  it("does not treat tying the global best streak as a new best", () => {
    const history = [makeRecord({ accuracy: 0.9, id: "old-1" })];

    const allTimeStats: AllTimeStats = {
      "flashcard:mnemonica": {
        globalBestStreak: 5,
        totalFails: 1,
        totalQuestions: 10,
        totalSessions: 1,
        totalSuccesses: 9,
      },
    };

    const record = makeRecord({
      accuracy: 0.7,
      bestStreak: 5,
      id: "new",
    });
    const summary = computeSessionSummary(record, history, allTimeStats);
    expect(summary.isNewGlobalBestStreak).toBe(false);
  });

  it("returns keepGoing key for low accuracy below 50%", () => {
    const history = [makeRecord({ accuracy: 0.4, id: "old-1" })];

    const record = makeRecord({
      accuracy: 0.3,
      bestStreak: 0,
      id: "new",
    });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.keepGoing",
    });
  });

  it("returns consistent key for high accuracy that does not exceed the rolling average", () => {
    const history = [makeRecord({ accuracy: 0.9, id: "old-1" })];
    const record = makeRecord({ accuracy: 0.8, bestStreak: 0, id: "new" });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.consistent",
    });
  });

  it("returns progress key for moderate accuracy between 50-80% that does not exceed the rolling average", () => {
    const history = [makeRecord({ accuracy: 0.7, id: "old-1" })];
    const record = makeRecord({ accuracy: 0.5, bestStreak: 0, id: "new" });
    const summary = computeSessionSummary(record, history, emptyStats);
    expect(summary.encouragement).toEqual({
      key: "session.encouragement.progress",
    });
  });

  it("includes previousAverageAccuracy when history exists", () => {
    const history = [
      makeRecord({ accuracy: 0.6, id: "old-1" }),
      makeRecord({ accuracy: 0.8, id: "old-2" }),
    ];

    const record = makeRecord({ accuracy: 0.5, bestStreak: 0, id: "new" });
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
      accuracy: 0.8,
      mode: "flashcard",
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
        globalBestStreak: 3,
        totalFails: 2,
        totalQuestions: 10,
        totalSessions: 1,
        totalSuccesses: 8,
      },
    };
    storage.set(ALL_TIME_STATS_LSK, JSON.stringify(existingStats));

    // Seed history so there's a previous average accuracy
    const oldRecord = makeRecord({ accuracy: 0.5, bestStreak: 3, id: "old" });
    storage.set(SESSION_HISTORY_LSK, JSON.stringify([oldRecord]));

    // Finalize a session with bestStreak=5, which exceeds the old globalBestStreak of 3
    const session = makeSession({ bestStreak: 5, id: "new-session" });
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
    const session = makeSession({ fails: 3, successes: 7 });
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
      callCount += 1;
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
  ])(
    "returns { ok: false, reason: 'serialize-failed' } when JSON.stringify throws on call $failingCall ($label)",
    ({ failingCall }) => {
      // serialize-failed is distinct from write-failed so triage can split a
      // bad payload (cyclic ref, BigInt) from a quota or permissions issue.
      const originalStringify = JSON.stringify;
      let callCount = 0;
      const stringifySpy = vi
        .spyOn(JSON, "stringify")
        .mockImplementation((value, replacer, space) => {
          callCount += 1;
          if (callCount === failingCall) {
            throw new TypeError("circular reference");
          }
          return originalStringify(value, replacer, space);
        });

      const session = makeSession();
      const result = finalizeSession(session);

      expect(result).toEqual({ ok: false, reason: "serialize-failed" });

      stringifySpy.mockRestore();
    }
  );

  it("returns { ok: false, reason: 'corrupt-prior-state' } and refuses to overwrite when stored history fails validation", () => {
    // Simulate corrupt prior history (e.g. partial write or schema drift after
    // an app update). finalizeSession must refuse to overwrite — otherwise the
    // user's previously-recoverable history would be silently destroyed by a
    // single new record.
    storage.set(
      SESSION_HISTORY_LSK,
      JSON.stringify([{ a: "session", record: true, totally: "not" }])
    );

    const session = makeSession();
    const result = finalizeSession(session);

    expect(result).toEqual({ ok: false, reason: "corrupt-prior-state" });

    // Importantly, the history was NOT overwritten — the corrupt blob is still
    // present so the user can attempt manual recovery (export, repair, etc.).
    expect(storage.get(SESSION_HISTORY_LSK)).toBe(
      JSON.stringify([{ a: "session", record: true, totally: "not" }])
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
      ...makeRecord({ accuracy: 0.8, id: session.id }),
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

  it("returns { ok: false, reason: 'corrupt-prior-state' } without writing when localStorage.getItem throws for every key", () => {
    // getItem throws while setItem would succeed: without the read-error
    // refusal, `[record]` would overwrite the whole unreadable history.
    storage.set(SESSION_HISTORY_LSK, JSON.stringify([makeRecord()]));
    vi.spyOn(mockLocalStorage, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    const setItemSpy = vi.spyOn(mockLocalStorage, "setItem");

    const result = finalizeSession(makeSession());

    expect(result).toEqual({ ok: false, reason: "corrupt-prior-state" });
    expect(setItemSpy).not.toHaveBeenCalled();
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

// --- Same-id upsert: a session saved on page hide, then saved again ---

const readHistory = (): SessionRecord[] =>
  JSON.parse(storage.get(SESSION_HISTORY_LSK) ?? "[]");

const readEntry = () => {
  const stats: AllTimeStats = JSON.parse(
    storage.get(ALL_TIME_STATS_LSK) ?? "{}"
  );
  return stats["flashcard:mnemonica"];
};

const checkpointOrThrow = (
  ...args: Parameters<typeof checkpointSession>
): SessionCheckpoint => {
  const result = checkpointSession(...args);
  if (!result.ok) {
    throw new Error(`Expected checkpointSession to succeed: ${result.reason}`);
  }
  return result.checkpoint;
};

// Fails the all-time stats write (the 2nd setItem) and, when asked, the
// history rollback (the 3rd), letting the history write through.
const failStatsWrite = ({ rollbackToo }: { rollbackToo: boolean }) => {
  const originalSetItem = mockLocalStorage.setItem;
  let callCount = 0;
  mockLocalStorage.setItem = (key: string, value: string) => {
    callCount += 1;
    if (callCount === 1 || (callCount === 3 && !rollbackToo)) {
      originalSetItem.call(mockLocalStorage, key, value);
      return;
    }
    throw new Error("QuotaExceededError");
  };
  return () => {
    mockLocalStorage.setItem = originalSetItem;
  };
};

describe("checkpointSession and same-id upsert", () => {
  const atHide = makeSession({
    bestStreak: 3,
    config: { type: "open" },
    fails: 1,
    id: "hidden-session",
    questionsCompleted: 5,
    successes: 4,
  });
  const atStop = {
    ...atHide,
    bestStreak: 4,
    fails: 2,
    questionsCompleted: 8,
    successes: 6,
  };

  it("hide, return, then Stop yields one record with the combined count, counted once", () => {
    const checkpoint = checkpointOrThrow(atHide);
    const result = finalizeSession(atStop, checkpoint);

    expect(result.ok).toBe(true);
    const history = readHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      id: "hidden-session",
      questionsCompleted: 8,
      successes: 6,
    });
    expect(readEntry()).toEqual({
      globalBestStreak: 4,
      totalFails: 2,
      totalQuestions: 8,
      totalSessions: 1,
      totalSuccesses: 6,
    });
  });

  it("hide, then the page is killed, leaves one record with the counts at hide time and no completion event", () => {
    checkpointOrThrow(atHide);

    const history = readHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ questionsCompleted: 5, successes: 4 });
    expect(readEntry()).toEqual({
      globalBestStreak: 3,
      totalFails: 1,
      totalQuestions: 5,
      totalSessions: 1,
      totalSuccesses: 4,
    });
    // The session has not ended, so GA must not see a completion.
    expect(eventBus.emit.SESSION_COMPLETED).not.toHaveBeenCalled();
  });

  it("two hides then Stop yield one record, counted once", () => {
    const first = checkpointOrThrow(atHide);
    const second = checkpointOrThrow(
      { ...atHide, fails: 2, questionsCompleted: 6 },
      first
    );
    finalizeSession(atStop, second);

    expect(readHistory()).toHaveLength(1);
    expect(readEntry()).toMatchObject({
      totalFails: 2,
      totalQuestions: 8,
      totalSessions: 1,
      totalSuccesses: 6,
    });
    expect(eventBus.emit.SESSION_COMPLETED).toHaveBeenCalledOnce();
  });

  it("persists a structured session hidden and killed", () => {
    checkpointOrThrow(
      makeSession({
        config: { totalQuestions: 10, type: "structured" },
        questionsCompleted: 4,
      })
    );

    const history = readHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      config: { totalQuestions: 10, type: "structured" },
      questionsCompleted: 4,
    });
    expect(readEntry()?.totalSessions).toBe(1);
  });

  it("replaces the checkpointed record even when another record was saved after it", () => {
    storage.set(
      SESSION_HISTORY_LSK,
      JSON.stringify([makeRecord({ id: "old" })])
    );
    const checkpoint = checkpointOrThrow(atHide);
    // Another tab saves a session while this one is hidden.
    finalizeSession(makeSession({ id: "other-tab" }));
    finalizeSession(atStop, checkpoint);

    expect(readHistory().map((r) => r.id)).toEqual([
      "hidden-session",
      "other-tab",
      "old",
    ]);
  });

  it("compares the final summary against the stats from before the first checkpoint", () => {
    const existingStats: AllTimeStats = {
      "flashcard:mnemonica": {
        globalBestStreak: 3,
        totalFails: 0,
        totalQuestions: 5,
        totalSessions: 1,
        totalSuccesses: 5,
      },
    };
    storage.set(ALL_TIME_STATS_LSK, JSON.stringify(existingStats));
    // The streak of 5 was reached before the hide, so the checkpoint has
    // already raised the stored best to 5.
    const checkpoint = checkpointOrThrow({ ...atHide, bestStreak: 5 });
    const result = finalizeSession({ ...atStop, bestStreak: 5 }, checkpoint);

    if (!result.ok) {
      throw new Error("Expected finalizeSession to succeed");
    }
    expect(result.summary.isNewGlobalBestStreak).toBe(true);
    expect(readEntry()?.totalSessions).toBe(2);
  });

  it("retries a failed final save with the same checkpoint without double counting", () => {
    const checkpoint = checkpointOrThrow(atHide);
    const restore = failStatsWrite({ rollbackToo: false });
    const failed = finalizeSession(atStop, checkpoint);
    restore();
    expect(failed).toEqual({ ok: false, reason: "write-failed" });

    finalizeSession(atStop, checkpoint);

    expect(readHistory()).toHaveLength(1);
    expect(readEntry()).toMatchObject({ totalQuestions: 8, totalSessions: 1 });
  });

  it("repairs the stats after a checkpoint that left history written but stats unwritten", () => {
    const restore = failStatsWrite({ rollbackToo: true });
    const failed = checkpointSession(atHide);
    restore();
    expect(failed).toEqual({ ok: false, reason: "corrupt" });

    // No checkpoint was stored for the failed save, so the next one adds the
    // full counts and replaces the stray history record.
    finalizeSession(atStop);

    expect(readHistory()).toHaveLength(1);
    expect(readEntry()).toMatchObject({ totalQuestions: 8, totalSessions: 1 });
  });

  it("refuses to overwrite corrupt prior history", () => {
    const corrupt = JSON.stringify([{ not: "a record" }]);
    storage.set(SESSION_HISTORY_LSK, corrupt);

    expect(checkpointSession(atHide)).toEqual({
      ok: false,
      reason: "corrupt-prior-state",
    });
    expect(storage.get(SESSION_HISTORY_LSK)).toBe(corrupt);
    expect(storage.get(ALL_TIME_STATS_LSK)).toBeUndefined();
  });

  it("keeps the breadcrumb of a failed checkpoint until a later save of the same session succeeds", () => {
    const restore = failStatsWrite({ rollbackToo: false });
    expect(checkpointSession(atHide).ok).toBe(false);
    restore();
    writeLastSaveFailedBreadcrumb("write-failed", atHide.id);
    // Page killed here: nothing saved the session, so the breadcrumb stays.
    expect(storage.has(LAST_SAVE_FAILED_LSK)).toBe(true);

    expect(finalizeSession(atStop).ok).toBe(true);

    expect(storage.has(LAST_SAVE_FAILED_LSK)).toBe(false);
  });

  it("clears the breadcrumb when a later checkpoint of the same session succeeds", () => {
    writeLastSaveFailedBreadcrumb("write-failed", atHide.id);

    checkpointOrThrow(atHide);

    expect(storage.has(LAST_SAVE_FAILED_LSK)).toBe(false);
  });

  it("keeps the breadcrumb of another session when this one saves", () => {
    writeLastSaveFailedBreadcrumb("write-failed", "lost-session");

    checkpointOrThrow(atHide);
    finalizeSession(atStop);

    expect(storage.has(LAST_SAVE_FAILED_LSK)).toBe(true);
  });
});

// --- Same-tab notification of useLocalDb subscribers ---

const EMPTY_HISTORY: SessionRecord[] = [];
const EMPTY_STATS: AllTimeStats = {};

const announcedKeys = (spy: { mock: { calls: unknown[][] } }): unknown[] =>
  spy.mock.calls.map(([event]) =>
    event instanceof CustomEvent ? event.detail.key : null
  );

describe("same-tab change notifications", () => {
  it("shows a mounted history and stats subscriber the finalized session without remount", () => {
    const history = renderHook(() =>
      useLocalDb(SESSION_HISTORY_LSK, EMPTY_HISTORY, isSessionRecordArray)
    );
    const stats = renderHook(() =>
      useLocalDb(ALL_TIME_STATS_LSK, EMPTY_STATS, isAllTimeStats)
    );
    expect(history.result.current[0]).toEqual([]);

    act(() => {
      finalizeSession(makeSession());
    });

    expect(history.result.current[0]).toHaveLength(1);
    expect(stats.result.current[0]["flashcard:mnemonica"]?.totalSessions).toBe(
      1
    );
  });

  it("shows a mounted history subscriber a checkpoint without remount", () => {
    const history = renderHook(() =>
      useLocalDb(SESSION_HISTORY_LSK, EMPTY_HISTORY, isSessionRecordArray)
    );

    act(() => {
      checkpointSession(makeSession());
    });

    expect(history.result.current[0]).toHaveLength(1);
  });

  it("announces history only when the stats write fails and history is rolled back", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const restore = failStatsWrite({ rollbackToo: false });
    finalizeSession(makeSession());
    restore();

    expect(announcedKeys(dispatchSpy)).toEqual([SESSION_HISTORY_LSK]);
  });

  it("announces history when the rollback also fails, so subscribers see what is on disk", () => {
    const history = renderHook(() =>
      useLocalDb(SESSION_HISTORY_LSK, EMPTY_HISTORY, isSessionRecordArray)
    );
    const restore = failStatsWrite({ rollbackToo: true });
    act(() => {
      finalizeSession(makeSession());
    });
    restore();

    expect(history.result.current[0]).toHaveLength(1);
  });

  it("still reports success when announcing the change throws", () => {
    vi.spyOn(window, "dispatchEvent").mockImplementation(() => {
      throw new Error("listener failed");
    });

    const result = finalizeSession(makeSession());

    expect(result.ok).toBe(true);
    expect(readHistory()).toHaveLength(1);
  });

  it("announces nothing when the history write fails", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const originalSetItem = mockLocalStorage.setItem;
    mockLocalStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    finalizeSession(makeSession());
    mockLocalStorage.setItem = originalSetItem;

    expect(announcedKeys(dispatchSpy)).toEqual([]);
  });
});
