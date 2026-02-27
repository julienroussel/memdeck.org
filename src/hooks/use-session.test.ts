/**
 * These tests exercise the full useSession hook by mocking React primitives
 * with a minimal state-machine simulation, following the same approach used
 * by use-session-history.test.ts and use-all-time-stats.test.ts.
 *
 * Pure function tests for deriveActiveSession, deriveIsStructuredSession,
 * and applyAnswerOutcome live in their colocated file session-phase.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveSession } from "../types/session";
import type { StackKey } from "../types/stacks";
import type { SessionPhase } from "./use-session";

// ---------------------------------------------------------------------------
// React mock state — shared by the mocked useState/useRef/useEffect/useCallback
// ---------------------------------------------------------------------------

let currentStatus: SessionPhase;
let pendingEffects: Array<() => undefined | (() => void)>;
let effectCleanups: Array<(() => void) | undefined>;
let refStore: Array<{ current: unknown }>;
let refIndex: number;

// ---------------------------------------------------------------------------
// Mocks (must be declared before vi.mock calls since vi.mock is hoisted)
// ---------------------------------------------------------------------------

const mockBuildSessionRecord = vi.fn();
const mockSaveSessionRecord = vi.fn();
const mockReadSessionHistory = vi.fn();
const mockReadAllTimeStats = vi.fn();
const mockComputeSessionSummary = vi.fn();
const mockUpdateAllTimeStats = vi.fn();
const mockEventBusEmit = {
  SESSION_STARTED: vi.fn(),
  SESSION_COMPLETED: vi.fn(),
  STACK_SELECTED: vi.fn(),
  FLASHCARD_ANSWER: vi.fn(),
  FLASHCARD_MODE_CHANGED: vi.fn(),
};

// Mock finalizeSession to delegate to the mocked persistence functions.
// This is needed because finalizeSession now lives in ../utils/session-persistence alongside
// the functions it calls, so vi.mock cannot intercept its internal references.
const mockFinalizeSession = vi.fn((session: ActiveSession) => {
  const record = mockBuildSessionRecord(session);
  mockSaveSessionRecord(record);
  const history = mockReadSessionHistory();
  const allTimeStats = mockReadAllTimeStats();
  const summary = mockComputeSessionSummary(record, history, allTimeStats);
  mockUpdateAllTimeStats(record);
  mockEventBusEmit.SESSION_COMPLETED({
    mode: record.mode,
    accuracy: record.accuracy,
    questionsCompleted: record.questionsCompleted,
  });
  return summary;
});

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => {
      if (currentStatus === undefined) {
        currentStatus = initial as SessionPhase;
      }
      const setState = (valueOrUpdater: unknown) => {
        if (typeof valueOrUpdater === "function") {
          currentStatus = (
            valueOrUpdater as (prev: SessionPhase) => SessionPhase
          )(currentStatus);
        } else {
          currentStatus = valueOrUpdater as SessionPhase;
        }
      };
      return [currentStatus, setState];
    },
    useRef: (initial: unknown) => {
      if (refIndex >= refStore.length) {
        refStore.push({ current: initial });
      }
      const ref = refStore[refIndex];
      refIndex++;
      return ref;
    },
    useCallback: (fn: unknown) => fn,
    useEffect: (fn: () => undefined | (() => void)) => {
      pendingEffects.push(fn);
    },
  };
});

vi.mock("../utils/session-persistence", async () => {
  const actual = await vi.importActual<
    typeof import("../utils/session-persistence")
  >("../utils/session-persistence");
  return {
    ...actual,
    finalizeSession: (session: ActiveSession) => mockFinalizeSession(session),
  };
});

vi.mock("../services/event-bus", () => ({
  eventBus: { emit: mockEventBusEmit },
}));

// Dynamic imports after mocks are wired up (vi.mock is hoisted above these)
const { useSession } = await import("./use-session");

// ---------------------------------------------------------------------------
// useSession hook integration tests
//
// These tests exercise the full useSession hook by mocking React primitives
// with a minimal state-machine simulation. The approach follows the same
// pattern used by use-session-history.test.ts and use-all-time-stats.test.ts
// (mocking React directly) but extends it to handle useState updaters and
// useEffect flush cycles that useSession relies on.
// ---------------------------------------------------------------------------

describe("useSession hook", () => {
  let uuidCounter: number;

  /**
   * Flush all pending effects. Previous cleanups are NOT run here because
   * the mock doesn't track dependency arrays. In real React, effects with
   * stable deps (like the beforeunload effect) don't re-run their cleanup
   * on re-render — only on unmount or when deps change. Running cleanups
   * every cycle would cause the beforeunload handler to prematurely
   * finalize the session (adding its ID to the dedup Set), which blocks
   * the actual auto-completion or stop finalization.
   */
  const flushEffects = () => {
    const effects = [...pendingEffects];
    pendingEffects = [];
    for (const effect of effects) {
      const cleanup = effect();
      effectCleanups.push(typeof cleanup === "function" ? cleanup : undefined);
    }
  };

  /** Re-invoke the hook to collect new effects, then flush them */
  const rerenderAndFlush = () => {
    refIndex = 0;
    pendingEffects = [];
    // biome-ignore lint/correctness/useHookAtTopLevel: test simulation — not a real React render
    const result = useSession({
      mode: "flashcard",
      stackKey: "mnemonica",
    });
    flushEffects();
    return result;
  };

  /** Call the hook once and flush initial effects, returning the result */
  const initHook = (
    options: { mode?: "flashcard" | "acaan"; stackKey?: string } = {}
  ) => {
    refIndex = 0;
    pendingEffects = [];
    const result = useSession({
      mode: options.mode ?? "flashcard",
      stackKey: (options.stackKey ?? "mnemonica") as StackKey,
    });
    flushEffects();
    return result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentStatus = undefined as unknown as SessionPhase;
    pendingEffects = [];
    effectCleanups = [];
    refStore = [];
    refIndex = 0;
    uuidCounter = 0;

    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: () => {
        uuidCounter++;
        return `test-uuid-${uuidCounter}`;
      },
    });

    // Default mock return values for finalization helpers
    mockBuildSessionRecord.mockImplementation((session: ActiveSession) => ({
      id: session.id,
      mode: session.mode,
      stackKey: session.stackKey,
      config: session.config,
      startedAt: session.startedAt,
      endedAt: "2025-01-01T00:10:00.000Z",
      durationSeconds: 600,
      successes: session.successes,
      fails: session.fails,
      questionsCompleted: session.questionsCompleted,
      accuracy:
        session.successes + session.fails > 0
          ? session.successes / (session.successes + session.fails)
          : 0,
      bestStreak: session.bestStreak,
    }));
    mockReadSessionHistory.mockReturnValue([]);
    mockReadAllTimeStats.mockReturnValue({});
    mockComputeSessionSummary.mockImplementation((record: unknown) => ({
      record,
      encouragement: "Nice!",
      isAccuracyImprovement: false,
      isNewGlobalBestStreak: false,
      previousAverageAccuracy: null,
    }));

    // Mock window.addEventListener/removeEventListener for beforeunload
    if (typeof globalThis.window === "undefined") {
      (globalThis as Record<string, unknown>).window = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    } else {
      vi.spyOn(window, "addEventListener").mockImplementation(vi.fn());
      vi.spyOn(window, "removeEventListener").mockImplementation(vi.fn());
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Tests -------------------------------------------------------------

  it("starts in idle phase", () => {
    const result = initHook();

    expect(result.status.phase).toBe("idle");
    expect(result.activeSession).toBeNull();
    expect(result.isStructuredSession).toBe(false);
  });

  it("transitions from idle to active when startSession is called", () => {
    const result = initHook();
    result.startSession({ type: "open" });

    const updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("active");
    expect(updated.activeSession).not.toBeNull();
    expect(updated.activeSession?.id).toBe("test-uuid-1");
    expect(updated.activeSession?.mode).toBe("flashcard");
    expect(updated.activeSession?.stackKey).toBe("mnemonica");
    expect(updated.activeSession?.config).toEqual({ type: "open" });
    expect(mockEventBusEmit.SESSION_STARTED).toHaveBeenCalledWith({
      mode: "flashcard",
      config: { type: "open" },
    });
  });

  it("increments successes and streak on a correct answer", () => {
    const result = initHook();
    result.startSession({ type: "open" });

    // First correct answer
    let updated = rerenderAndFlush();
    updated.handleAnswer({ correct: true, questionAdvanced: true });

    updated = rerenderAndFlush();
    expect(updated.activeSession?.successes).toBe(1);
    expect(updated.activeSession?.currentStreak).toBe(1);
    expect(updated.activeSession?.bestStreak).toBe(1);
    expect(updated.activeSession?.questionsCompleted).toBe(1);

    // Second correct answer
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();
    expect(updated.activeSession?.successes).toBe(2);
    expect(updated.activeSession?.currentStreak).toBe(2);
    expect(updated.activeSession?.bestStreak).toBe(2);
  });

  it("increments fails and resets streak on an incorrect answer", () => {
    const result = initHook();
    result.startSession({ type: "open" });

    // Build a streak first
    let updated = rerenderAndFlush();
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();

    expect(updated.activeSession?.currentStreak).toBe(2);
    expect(updated.activeSession?.bestStreak).toBe(2);

    // Incorrect answer resets current streak but preserves best streak
    updated.handleAnswer({ correct: false, questionAdvanced: true });
    updated = rerenderAndFlush();

    expect(updated.activeSession?.fails).toBe(1);
    expect(updated.activeSession?.currentStreak).toBe(0);
    expect(updated.activeSession?.bestStreak).toBe(2);
  });

  it("increments questionsCompleted when questionAdvanced is true", () => {
    const result = initHook();
    result.startSession({ type: "open" });

    let updated = rerenderAndFlush();

    // Answer that advances the question
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();
    expect(updated.activeSession?.questionsCompleted).toBe(1);

    // Answer that does NOT advance the question (e.g. partial answer)
    updated.handleAnswer({ correct: false, questionAdvanced: false });
    updated = rerenderAndFlush();
    expect(updated.activeSession?.questionsCompleted).toBe(1);

    // Another advancing answer
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();
    expect(updated.activeSession?.questionsCompleted).toBe(2);
  });

  it("auto-completes a structured session when totalQuestions is reached", () => {
    const result = initHook();
    result.startSession({ type: "structured", totalQuestions: 10 });

    let updated = rerenderAndFlush();

    // Answer 9 questions (one short of completion)
    for (let i = 0; i < 9; i++) {
      updated.handleAnswer({ correct: true, questionAdvanced: true });
      updated = rerenderAndFlush();
    }

    expect(updated.activeSession?.questionsCompleted).toBe(9);
    expect(updated.status.phase).toBe("active");

    // The 10th answer triggers auto-completion
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    // First re-render: the setState updater sets pendingFinalizationRef,
    // then the effect flushes and calls setStatus to summary phase.
    updated = rerenderAndFlush();
    // Second re-render: needed to read the state set by the effect.
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("summary");
    expect(mockBuildSessionRecord).toHaveBeenCalled();
    expect(mockSaveSessionRecord).toHaveBeenCalled();
    expect(mockEventBusEmit.SESSION_COMPLETED).toHaveBeenCalled();
  });

  it("returns to idle when stopping an open session with fewer than 3 questions", () => {
    const result = initHook();
    result.startSession({ type: "open" });

    let updated = rerenderAndFlush();
    expect(updated.status.phase).toBe("active");

    // Answer only 2 questions (below threshold of 3 for open sessions)
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();

    expect(updated.activeSession?.questionsCompleted).toBe(2);

    // Stop the session -- should discard and return to idle
    updated.stopSession();
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("idle");
    expect(mockBuildSessionRecord).not.toHaveBeenCalled();
    expect(mockSaveSessionRecord).not.toHaveBeenCalled();
  });

  it("persists and shows summary when stopping an open session with 3 or more questions", () => {
    const result = initHook();
    result.startSession({ type: "open" });

    let updated = rerenderAndFlush();

    // Answer 3 questions (meets minimum threshold for open sessions)
    for (let i = 0; i < 3; i++) {
      updated.handleAnswer({ correct: true, questionAdvanced: true });
      updated = rerenderAndFlush();
    }

    expect(updated.activeSession?.questionsCompleted).toBe(3);

    // Stop the session -- should finalize and show summary.
    // First re-render: stopSession sets pendingFinalizationRef via the
    // setState updater, then the effect flushes and calls setStatus.
    updated.stopSession();
    updated = rerenderAndFlush();
    // Second re-render: needed to read the state set by the effect.
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("summary");
    expect(mockBuildSessionRecord).toHaveBeenCalled();
    expect(mockSaveSessionRecord).toHaveBeenCalled();
    expect(mockComputeSessionSummary).toHaveBeenCalled();
    expect(mockUpdateAllTimeStats).toHaveBeenCalled();
    expect(mockEventBusEmit.SESSION_COMPLETED).toHaveBeenCalled();
  });

  it("dismissSummary returns to idle from summary phase", () => {
    const result = initHook();
    result.startSession({ type: "structured", totalQuestions: 10 });

    let updated = rerenderAndFlush();

    // Complete a structured session to reach summary phase
    for (let i = 0; i < 10; i++) {
      updated.handleAnswer({ correct: true, questionAdvanced: true });
      updated = rerenderAndFlush();
    }
    // Flush finalization effect + re-render to read summary state
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("summary");

    // Dismiss the summary
    updated.dismissSummary();
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("idle");
    expect(updated.activeSession).toBeNull();
  });

  it("startNewSession dismisses summary and starts a new session with the same config", () => {
    const result = initHook();
    result.startSession({ type: "structured", totalQuestions: 10 });

    let updated = rerenderAndFlush();

    // Complete a structured session to reach summary phase
    for (let i = 0; i < 10; i++) {
      updated.handleAnswer({ correct: true, questionAdvanced: true });
      updated = rerenderAndFlush();
    }
    // Flush finalization effect + re-render to read summary state
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("summary");

    // Start a new session from the summary screen
    updated.startNewSession();
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("active");
    expect(updated.activeSession).not.toBeNull();
    expect(updated.activeSession?.config).toEqual({
      type: "structured",
      totalQuestions: 10,
    });
    // Should be a fresh session with zero counters
    expect(updated.activeSession?.successes).toBe(0);
    expect(updated.activeSession?.fails).toBe(0);
    expect(updated.activeSession?.questionsCompleted).toBe(0);
  });
});
