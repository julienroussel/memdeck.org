/**
 * These tests exercise the full useSession hook by mocking React primitives
 * with a minimal state-machine simulation, following the same approach used
 * by use-session-history.test.ts and use-all-time-stats.test.ts.
 *
 * Pure function tests for deriveActiveSession, deriveIsStructuredSession,
 * and applyAnswerOutcome live in their colocated file session-phase.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DistanceConvention, DistanceMode } from "../types/distance";
import type { ActiveSession } from "../types/session";
import { DEFAULT_STACK_LIMITS, type StackLimits } from "../types/stack-limits";
import { createDeckPosition, type StackKey } from "../types/stacks";
import type { SessionPhase } from "./use-session";

// ---------------------------------------------------------------------------
// React mock state — shared by the mocked useState/useRef/useEffect/useCallback
// ---------------------------------------------------------------------------

let currentStatus: SessionPhase;
let pendingEffects: Array<() => undefined | (() => void)>;
let effectCleanups: Array<(() => void) | undefined>;
let refStore: Array<{ current: unknown }>;
let refIndex: number;
// Slots for additional useState calls beyond the primary status state.
// useSession uses a secondary useState for the flush-tick counter.
let stateSlots: unknown[];
let stateIndex: number;

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
// Typed loosely as the union of success and failure shapes so individual
// tests can `mockReturnValueOnce` a specific failure reason without TS
// narrowing the inferred return type to the success branch.
type MockFinalizeResult =
  | { ok: true; summary: unknown }
  | {
      ok: false;
      reason:
        | "write-failed"
        | "serialize-failed"
        | "corrupt"
        | "corrupt-prior-state";
    };
const mockFinalizeSession = vi.fn(
  (session: ActiveSession): MockFinalizeResult => {
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
    return { ok: true, summary };
  }
);

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => {
      // First useState call is the SessionPhase status. Subsequent calls
      // (e.g. the flush-tick counter) use independent slots so that
      // updating one doesn't clobber the other.
      const slot = stateIndex;
      stateIndex++;
      if (slot === 0) {
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
      }
      if (slot >= stateSlots.length) {
        stateSlots.push(initial);
      }
      const setSlot = (valueOrUpdater: unknown) => {
        if (typeof valueOrUpdater === "function") {
          stateSlots[slot] = (valueOrUpdater as (prev: unknown) => unknown)(
            stateSlots[slot]
          );
        } else {
          stateSlots[slot] = valueOrUpdater;
        }
      };
      return [stateSlots[slot], setSlot];
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

const mockNotificationsShow = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: (args: unknown) => mockNotificationsShow(args),
  },
}));

const mockTrackError = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackError: (...args: unknown[]) => mockTrackError(...args),
  },
}));

const mockReadBreadcrumb = vi.fn();
const mockClearBreadcrumb = vi.fn();
const mockHasNotifShown = vi.fn();
const mockMarkNotifShown = vi.fn();
vi.mock("../utils/session-breadcrumbs", () => ({
  readLastSaveFailedBreadcrumb: () => mockReadBreadcrumb(),
  clearLastSaveFailedBreadcrumb: () => mockClearBreadcrumb(),
  hasLastSaveFailedNotificationBeenShown: (failedAt: string) =>
    mockHasNotifShown(failedAt),
  markLastSaveFailedNotificationShown: (failedAt: string) =>
    mockMarkNotifShown(failedAt),
  writeLastSaveFailedBreadcrumb: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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
    stateIndex = 0;
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
    stateIndex = 0;
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
    stateSlots = [];
    stateIndex = 0;
    uuidCounter = 0;

    // Default the breadcrumb mocks to a "no prior failure" state so tests
    // that don't care about the breadcrumb (the vast majority) don't crash
    // when the mount effect dereferences `breadcrumb.failedAt`. The
    // dedicated breadcrumb describe block overrides these per-test.
    mockReadBreadcrumb.mockReturnValue(null);
    mockHasNotifShown.mockReturnValue(false);

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

    // The 10th answer triggers auto-completion. Three rerender cycles are
    // needed because the auto-finalize logic now lives in a useEffect on
    // `status` rather than a synchronous side effect inside the
    // recordQuestionAdvanced callback:
    //   #1 commits the answer's setState updates and runs the auto-finalize
    //      effect, which bumps flushTick. The flush effect's closure (from
    //      this same render's call to useSession) captured flushTick at its
    //      pre-bump value, so it cannot observe the new tick within the same
    //      flushEffects() cycle.
    //   #2 re-runs useSession with the bumped flushTick captured; the flush
    //      effect now persists and calls setStatus({ phase: "summary" }).
    //   #3 reads the summary phase from useSession's return.
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();
    updated = rerenderAndFlush();
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("summary");
    expect(mockBuildSessionRecord).toHaveBeenCalled();
    expect(mockSaveSessionRecord).toHaveBeenCalled();
    expect(mockEventBusEmit.SESSION_COMPLETED).toHaveBeenCalled();
  });

  it("auto-finalize persists same-event sibling increments alongside the question advance", () => {
    // The auto-finalize effect observes the COMMITTED status and passes it to
    // requestFinalization, so increments produced earlier in the same event
    // handler (recordCorrect's successes/streak bump from applyAnswerOutcome,
    // session-phase.ts) reach the persisted record alongside the
    // questionsCompleted bump. The mocked useState in this file applies
    // updaters eagerly without batching, so this test pins the
    // committed-status-passthrough contract — NOT the prev-vs-stale invariant
    // (the recording hook's setStatus(prev => …) form is what guarantees
    // that, covered under real React batching in
    // use-session-recording.test.ts).
    const result = initHook();
    result.startSession({ type: "structured", totalQuestions: 1 });

    let updated = rerenderAndFlush();

    // The single answer triggers both:
    //   - recordCorrect (successes/currentStreak/bestStreak ++)
    //   - recordQuestionAdvanced (questionsCompleted ++ to 1, hits limit)
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    updated = rerenderAndFlush();
    updated = rerenderAndFlush();
    updated = rerenderAndFlush();

    expect(updated.status.phase).toBe("summary");
    expect(mockBuildSessionRecord).toHaveBeenCalledOnce();
    expect(mockBuildSessionRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        questionsCompleted: 1,
        successes: 1,
        currentStreak: 1,
        bestStreak: 1,
      })
    );
  });

  it("auto-finalize requests at most once per session id even if the threshold remains met across multiple renders", () => {
    // Simulates a persistence failure so the phase stays "active" with
    // questionsCompleted >= totalQuestions across multiple subsequent
    // renders. The auto-finalize effect must short-circuit on its dedupe ref
    // and not request a second finalization. The persistence-layer dedupe in
    // finalizedIdsRef wouldn't help here because that ref is only populated
    // on a successful write — the auto-finalize-layer ref is what holds the
    // line on a failure.
    mockFinalizeSession.mockReturnValueOnce({
      ok: false,
      reason: "write-failed",
    });
    const result = initHook();
    result.startSession({ type: "structured", totalQuestions: 1 });

    let updated = rerenderAndFlush();
    updated.handleAnswer({ correct: true, questionAdvanced: true });
    // Drive several rerenders past threshold; auto-finalize must only
    // request finalize on the first one.
    updated = rerenderAndFlush();
    updated = rerenderAndFlush();
    updated = rerenderAndFlush();
    updated = rerenderAndFlush();

    // Phase remained active because the write failed.
    expect(updated.status.phase).toBe("active");
    // Despite the threshold staying met across multiple renders,
    // finalizeSession was attempted exactly once.
    expect(mockFinalizeSession).toHaveBeenCalledOnce();
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
    // Two extra rerenders to drain the auto-finalize → flush → summary chain
    // (see the comment in the auto-completes test above for the cycle).
    updated = rerenderAndFlush();
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
    // Two extra rerenders to drain the auto-finalize → flush → summary chain
    // (see the comment in the auto-completes test above for the cycle).
    updated = rerenderAndFlush();
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

  // --- Distance mode -----------------------------------------------------

  /** Invoke useSession in distance mode and flush initial effects. Used for
   *  both the initial render and subsequent re-invocations — the React state
   *  mocks (`currentStatus`, `refStore`) carry state across calls. */
  const renderDistance = (overrides?: {
    distanceMode?: DistanceMode;
    distanceConvention?: DistanceConvention;
  }) => {
    refIndex = 0;
    stateIndex = 0;
    pendingEffects = [];
    const result = useSession({
      mode: "distance",
      stackKey: "mnemonica",
      distanceMode: overrides?.distanceMode,
      distanceConvention: overrides?.distanceConvention,
    });
    flushEffects();
    return result;
  };

  it("starts a distance session with explicit distanceMode and distanceConvention", () => {
    const result = renderDistance({
      distanceMode: "compute",
      distanceConvention: "signed",
    });
    result.startSession({ type: "open" });

    const updated = renderDistance({
      distanceMode: "compute",
      distanceConvention: "signed",
    });

    expect(updated.status.phase).toBe("active");
    expect(updated.activeSession?.mode).toBe("distance");
    if (updated.activeSession?.mode === "distance") {
      expect(updated.activeSession.distanceMode).toBe("compute");
      expect(updated.activeSession.distanceConvention).toBe("signed");
    }
  });

  it("falls back to default distanceMode and distanceConvention when undefined", () => {
    const result = renderDistance();
    result.startSession({ type: "open" });

    const updated = renderDistance();

    expect(updated.activeSession?.mode).toBe("distance");
    if (updated.activeSession?.mode === "distance") {
      expect(updated.activeSession.distanceMode).toBe("both");
      expect(updated.activeSession.distanceConvention).toBe("cyclic");
    }
  });

  it("emits SESSION_STARTED with mode 'distance'", () => {
    const result = renderDistance({
      distanceMode: "apply",
      distanceConvention: "cyclic",
    });
    result.startSession({ type: "structured", totalQuestions: 10 });

    expect(mockEventBusEmit.SESSION_STARTED).toHaveBeenCalledWith({
      mode: "distance",
      config: { type: "structured", totalQuestions: 10 },
    });
  });

  // --- Mid-session stackLimits re-snapshot --------------------------------

  /** Invoke useSession with a specific stackLimits and flush effects. */
  const renderWithLimits = (stackLimits: StackLimits) => {
    refIndex = 0;
    stateIndex = 0;
    pendingEffects = [];
    // biome-ignore lint/correctness/useHookAtTopLevel: test simulation — not a real React render
    const result = useSession({
      mode: "flashcard",
      stackKey: "mnemonica",
      stackLimits,
    });
    flushEffects();
    return result;
  };

  it("re-snapshots stackLimits in the active session when limits change mid-session", () => {
    const limitsA = DEFAULT_STACK_LIMITS;
    const limitsB: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };

    const result = renderWithLimits(limitsA);
    result.startSession({ type: "open" });

    let updated = renderWithLimits(limitsA);
    expect(updated.activeSession?.stackLimits).toEqual(limitsA);

    // Change stackLimits — the re-snapshot effect calls setStatus during
    // the flush, so a second render is needed to read the updated state
    // (same pattern as auto-completion / stop-session tests above).
    renderWithLimits(limitsB);
    updated = renderWithLimits(limitsB);
    expect(updated.activeSession?.stackLimits).toEqual(limitsB);
  });

  it("does not re-snapshot when limits are structurally equal across renders", () => {
    const limits: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };
    const sameLimitsNewRef: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };

    const result = renderWithLimits(limits);
    result.startSession({ type: "open" });

    let updated = renderWithLimits(limits);
    const sessionBefore = updated.activeSession;
    expect(sessionBefore?.stackLimits).toEqual(limits);

    // Re-render with a DIFFERENT object identity but identical start/end.
    // The structural-equality early-return should prevent any setStatus.
    updated = renderWithLimits(sameLimitsNewRef);
    expect(updated.activeSession).toBe(sessionBefore);
  });

  it("does not fire the re-snapshot effect while phase is idle", () => {
    // Mount in idle (no startSession) and change limits — nothing should
    // happen because the effect early-returns when phase !== "active".
    const limitsA = DEFAULT_STACK_LIMITS;
    const limitsB: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };

    let updated = renderWithLimits(limitsA);
    expect(updated.status.phase).toBe("idle");

    updated = renderWithLimits(limitsB);
    expect(updated.status.phase).toBe("idle");
    expect(updated.activeSession).toBeNull();
  });

  it("patches a queued pendingFinalizationRef when limits change after stopSession", () => {
    const limitsA = DEFAULT_STACK_LIMITS;
    const limitsB: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };

    const result = renderWithLimits(limitsA);
    result.startSession({ type: "open" });

    let updated = renderWithLimits(limitsA);

    // Reach the auto-save threshold so stopSession will queue finalization
    // rather than just returning to idle.
    for (let i = 0; i < 3; i++) {
      updated.handleAnswer({ correct: true, questionAdvanced: true });
      updated = renderWithLimits(limitsA);
    }

    // Stop now: stopSession sets pendingFinalizationRef but leaves
    // phase === "active" until the flush effect runs.
    updated.stopSession();
    // Change limits BEFORE the next flush so the re-snapshot effect runs
    // alongside the flush effect on the same render. The re-snapshot must
    // patch pendingFinalizationRef, otherwise the persisted record
    // captures the OLD limits.
    renderWithLimits(limitsB);
    // Two more renders: one to flush the finalization effect (which calls
    // setStatus to summary), one to read the updated state.
    renderWithLimits(limitsB);
    updated = renderWithLimits(limitsB);

    expect(updated.status.phase).toBe("summary");
    // The persisted record should reflect the new limits, not the old ones.
    const calls = mockBuildSessionRecord.mock.calls;
    const finalizedSession = calls.at(-1)?.[0];
    expect(finalizedSession?.stackLimits).toEqual(limitsB);
  });

  describe("flush effect — persistence failure surfacing", () => {
    /**
     * Drives a session through Stop and asserts `finalizeSession` returned the
     * supplied failure shape, then re-renders so the flush effect runs.
     */
    const completeAndStop = (): ReturnType<typeof useSession> => {
      let updated = rerenderAndFlush();
      // Build at least 3 questions to clear meetsMinimumSaveThreshold.
      for (let i = 0; i < 3; i++) {
        updated.handleAnswer({ correct: true, questionAdvanced: true });
        updated = rerenderAndFlush();
      }
      updated.stopSession();
      // Two flushes: one to enqueue the finalization, one to run the flush
      // effect that surfaces the failure.
      updated = rerenderAndFlush();
      updated = rerenderAndFlush();
      return updated;
    };

    it("shows the generic save-failed notification and keeps phase active when finalize returns write-failed", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "write-failed",
      });
      const result = initHook();
      result.startSession({ type: "open" });
      const updated = completeAndStop();

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "red",
          title: "errors.sessionSaveFailed.title",
          message: "errors.sessionSaveFailed.message",
        })
      );
      // Phase stays active so the user can retry Stop after clearing storage.
      expect(updated.status.phase).toBe("active");
      // Every finalize failure reports to analytics — the auto-save cleanup
      // path reports unconditionally and asymmetry here was undercounting
      // user-Stop quota failures in GA.
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Session finalize: write-failed" }),
        "useSession:flush"
      );
    });

    it("shows the corrupt-storage notification and reports analytics when finalize returns corrupt", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "corrupt",
      });
      const result = initHook();
      result.startSession({ type: "open" });
      const updated = completeAndStop();

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "red",
          title: "errors.sessionStorageCorrupt.title",
          message: "errors.sessionStorageCorrupt.message",
        })
      );
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Session finalize: corrupt" }),
        "useSession:flush"
      );
      // Phase stays active but the session id was added to finalizedIds so
      // a Stop retry doesn't re-show the notification — the user must clear
      // storage to recover.
      expect(updated.status.phase).toBe("active");
    });

    it("shows the corrupt-storage notification when finalize returns corrupt-prior-state (refused to overwrite)", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "corrupt-prior-state",
      });
      const result = initHook();
      result.startSession({ type: "open" });
      completeAndStop();

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "red",
          title: "errors.sessionStorageCorrupt.title",
        })
      );
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Session finalize: corrupt-prior-state",
        }),
        "useSession:flush"
      );
    });

    it("reports analytics on serialize-failed but uses the generic notification (recoverable bucket)", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "serialize-failed",
      });
      const result = initHook();
      result.startSession({ type: "open" });
      completeAndStop();

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "errors.sessionSaveFailed.title",
        })
      );
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Session finalize: serialize-failed",
        }),
        "useSession:flush"
      );
    });
  });

  describe("last-save-failed breadcrumb on mount", () => {
    beforeEach(() => {
      // Default: no prior sentinel, so the mount effect proceeds through the
      // legacy clear-and-show path. Tests that exercise the sentinel-match
      // branch override this with `mockHasNotifShown.mockReturnValueOnce(true)`.
      mockHasNotifShown.mockReturnValue(false);
    });

    it("surfaces a yellow notification and clears the breadcrumb when one was left by the prior session", () => {
      mockReadBreadcrumb.mockReturnValueOnce({
        reason: "write-failed",
        failedAt: "2025-01-01T00:00:00.000Z",
      });
      initHook();

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "yellow",
          title: "errors.lastSaveFailed.title",
          message: "errors.lastSaveFailed.message",
        })
      );
      expect(mockClearBreadcrumb).toHaveBeenCalledOnce();
    });

    it("does nothing when no breadcrumb is present", () => {
      mockReadBreadcrumb.mockReturnValueOnce(null);
      initHook();

      expect(mockNotificationsShow).not.toHaveBeenCalled();
      expect(mockClearBreadcrumb).not.toHaveBeenCalled();
    });

    it("shows the mount-time notification at most once even when clearLastSaveFailedBreadcrumb cannot actually clear the breadcrumb", () => {
      // Simulate the stuck-breadcrumb scenario: clear is silent (the util
      // swallows internal errors) but storage still holds the breadcrumb,
      // so every subsequent `readLastSaveFailedBreadcrumb` returns the same
      // value. The session-scoped latch (lastSaveBreadcrumbCheckedRef) must
      // prevent the notification from re-firing across re-renders. The
      // sessionStorage sentinel is the across-mount layer (covered by
      // separate tests below); this one pins the within-mount latch.
      mockReadBreadcrumb.mockReturnValue({
        reason: "write-failed",
        failedAt: "2025-01-01T00:00:00.000Z",
      });
      // clear silently succeeds (does not throw) but in this scenario the
      // underlying storage write also failed — i.e. the breadcrumb remains.
      mockClearBreadcrumb.mockImplementation(() => undefined);

      initHook();
      // Re-render multiple times: latch must keep the notification idempotent
      // even though the breadcrumb read keeps returning a value.
      rerenderAndFlush();
      rerenderAndFlush();

      const lastSaveFailedShows = mockNotificationsShow.mock.calls.filter(
        (call) => call[0]?.title === "errors.lastSaveFailed.title"
      );
      expect(lastSaveFailedShows).toHaveLength(1);

      mockReadBreadcrumb.mockReset();
      mockClearBreadcrumb.mockReset();
      mockHasNotifShown.mockReset();
      mockMarkNotifShown.mockReset();
    });

    it("suppresses the notification when the sentinel already matches the breadcrumb's failedAt (across-mount loop fix, issue #629)", () => {
      mockReadBreadcrumb.mockReturnValueOnce({
        reason: "write-failed",
        failedAt: "2025-01-01T00:00:00.000Z",
      });
      mockHasNotifShown.mockReturnValueOnce(true);

      initHook();

      const lastSaveFailedShows = mockNotificationsShow.mock.calls.filter(
        (call) => call[0]?.title === "errors.lastSaveFailed.title"
      );
      expect(lastSaveFailedShows).toHaveLength(0);
      // Skipping clear when the sentinel already matches avoids re-firing
      // analytics.trackError on every reload in the stuck-breadcrumb state.
      expect(mockClearBreadcrumb).not.toHaveBeenCalled();
      expect(mockMarkNotifShown).not.toHaveBeenCalled();
    });

    it("marks the sentinel with the breadcrumb's failedAt before showing on the first mount", () => {
      const failedAt = "2025-01-01T00:00:00.000Z";
      mockReadBreadcrumb.mockReturnValueOnce({
        reason: "write-failed",
        failedAt,
      });
      mockHasNotifShown.mockReturnValueOnce(false);

      initHook();

      expect(mockClearBreadcrumb).toHaveBeenCalledOnce();
      expect(mockMarkNotifShown).toHaveBeenCalledWith(failedAt);
      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "yellow",
          title: "errors.lastSaveFailed.title",
          message: "errors.lastSaveFailed.message",
        })
      );
    });

    it("queries the sentinel using the breadcrumb's failedAt — pins the keying contract", () => {
      const failedAt = "2025-06-15T08:30:42.123Z";
      mockReadBreadcrumb.mockReturnValueOnce({
        reason: "serialize-failed",
        failedAt,
      });

      initHook();

      expect(mockHasNotifShown).toHaveBeenCalledWith(failedAt);
    });
  });

  describe("flush effect — language-change isolation (M7)", () => {
    it("does not re-finalize a completed session on a language change re-render", () => {
      // Run a full Stop flow so finalize succeeds and the session id is in
      // finalizedIdsRef. A subsequent re-render that would have happened
      // because `t` changed identity (language change) must not re-fire
      // finalize. Pre-fix, the flush effect's dep list included `t`, so a
      // language change would re-run the effect — pendingFinalizationRef is
      // cleared so it would no-op for the queue, but the test pins the
      // observable invariant: no extra finalize calls.
      const result = initHook();
      result.startSession({ type: "open" });
      let updated = rerenderAndFlush();
      for (let i = 0; i < 3; i++) {
        updated.handleAnswer({ correct: true, questionAdvanced: true });
        updated = rerenderAndFlush();
      }
      updated.stopSession();
      updated = rerenderAndFlush();
      updated = rerenderAndFlush();
      expect(updated.status.phase).toBe("summary");
      const finalizeCallsAfterStop = mockFinalizeSession.mock.calls.length;

      // Simulate a language-change re-render (additional rerenders).
      rerenderAndFlush();
      rerenderAndFlush();

      // No additional finalize calls — the dep-list fix means the flush
      // effect doesn't re-run on `t` identity changes, and the
      // pendingFinalizationRef-null + finalizedIdsRef guards keep it
      // idempotent under the harness's flush-everything semantics.
      expect(mockFinalizeSession.mock.calls.length).toBe(
        finalizeCallsAfterStop
      );
    });
  });
});
