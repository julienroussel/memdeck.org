/**
 * Integration tests for the `useSession` hook driven against real React via
 * `@testing-library/react`. Only collaborators (persistence, analytics,
 * notifications, breadcrumbs, i18n) are mocked; React's lifecycle (state,
 * effects, refs, batching) is the genuine article.
 *
 * Pure function tests for deriveActiveSession, deriveIsStructuredSession,
 * and applyAnswerOutcome live in their colocated file session-phase.test.ts.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DistanceConvention, DistanceMode } from "../types/distance";
import type { ActiveSession } from "../types/session";
import { DEFAULT_STACK_LIMITS, type StackLimits } from "../types/stack-limits";
import { createDeckPosition, type StackKey } from "../types/stacks";
// Imported via the `use-session` re-export — pins the public type surface of
// the hook (status phase) as the contract these tests assert against.
import type { SessionPhase } from "./use-session";

/**
 * Narrowing helper for `status` reads in this file. Mirrors the `assertActive`
 * pattern in `use-session-recording.test.ts`. Centralized so tests can assert
 * on `status.session` without an `as` cast.
 */
function assertPhase<P extends SessionPhase["phase"]>(
  status: SessionPhase,
  phase: P
): asserts status is Extract<SessionPhase, { phase: P }> {
  if (status.phase !== phase) {
    throw new Error(`expected phase "${phase}", got "${status.phase}"`);
  }
}

// ---------------------------------------------------------------------------
// Collaborator mocks (vi.mock is hoisted above the dynamic imports below)
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

type SessionRenderProps = {
  mode?: "flashcard" | "acaan";
  stackKey?: StackKey;
  stackLimits?: StackLimits;
};

type DistanceRenderProps = {
  distanceMode?: DistanceMode;
  distanceConvention?: DistanceConvention;
};

describe("useSession hook", () => {
  let uuidCounter: number;

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -----------------------------------------------------------------------
  // Phase transitions
  // -----------------------------------------------------------------------

  it("starts in idle phase", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    expect(result.current.status.phase).toBe("idle");
    expect(result.current.activeSession).toBeNull();
    expect(result.current.isStructuredSession).toBe(false);
  });

  it("transitions from idle to active when startSession is called", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    const { status } = result.current;
    assertPhase(status, "active");
    expect(status.session.id).toBe("test-uuid-1");
    expect(status.session.mode).toBe("flashcard");
    expect(status.session.stackKey).toBe("mnemonica");
    expect(status.session.config).toEqual({ type: "open" });
    expect(result.current.activeSession).not.toBeNull();
    expect(mockEventBusEmit.SESSION_STARTED).toHaveBeenCalledWith({
      mode: "flashcard",
      config: { type: "open" },
    });
  });

  it("captures timed=true from options onto the active session", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica", timed: true })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    const { status } = result.current;
    assertPhase(status, "active");
    expect(status.session.timed).toBe(true);
  });

  it("defaults timed to false when the option is omitted", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    const { status } = result.current;
    assertPhase(status, "active");
    expect(status.session.timed).toBe(false);
  });

  it("increments successes and streak on a correct answer", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });

    expect(result.current.activeSession?.successes).toBe(1);
    expect(result.current.activeSession?.currentStreak).toBe(1);
    expect(result.current.activeSession?.bestStreak).toBe(1);
    expect(result.current.activeSession?.questionsCompleted).toBe(1);

    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });

    expect(result.current.activeSession?.successes).toBe(2);
    expect(result.current.activeSession?.currentStreak).toBe(2);
    expect(result.current.activeSession?.bestStreak).toBe(2);
  });

  it("increments fails and resets streak on an incorrect answer", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });
    // Build a streak first
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });
    expect(result.current.activeSession?.currentStreak).toBe(2);
    expect(result.current.activeSession?.bestStreak).toBe(2);

    // Incorrect answer resets current streak but preserves best streak
    act(() => {
      result.current.handleAnswer({ correct: false, questionAdvanced: true });
    });

    expect(result.current.activeSession?.fails).toBe(1);
    expect(result.current.activeSession?.currentStreak).toBe(0);
    expect(result.current.activeSession?.bestStreak).toBe(2);
  });

  it("increments questionsCompleted only when questionAdvanced is true", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });
    expect(result.current.activeSession?.questionsCompleted).toBe(1);

    // Answer that does NOT advance the question (e.g. partial answer)
    act(() => {
      result.current.handleAnswer({ correct: false, questionAdvanced: false });
    });
    expect(result.current.activeSession?.questionsCompleted).toBe(1);

    // Another advancing answer
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });
    expect(result.current.activeSession?.questionsCompleted).toBe(2);
  });

  it("auto-completes a structured session when totalQuestions is reached", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "structured", totalQuestions: 10 });
    });

    // Answer 9 questions (one short of completion)
    for (let i = 0; i < 9; i++) {
      act(() => {
        result.current.handleAnswer({ correct: true, questionAdvanced: true });
      });
    }

    expect(result.current.activeSession?.questionsCompleted).toBe(9);
    expect(result.current.status.phase).toBe("active");

    // The 10th answer triggers auto-completion via the auto-finalize useEffect
    // on `status` → flush effect drains the queue → setStatus({phase:"summary"}).
    // Real React batching + act() flushes the entire effect chain in one go.
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });

    expect(result.current.status.phase).toBe("summary");
    expect(mockBuildSessionRecord).toHaveBeenCalled();
    expect(mockSaveSessionRecord).toHaveBeenCalled();
    expect(mockEventBusEmit.SESSION_COMPLETED).toHaveBeenCalled();
  });

  it("auto-finalize persists same-event sibling increments alongside the question advance", () => {
    // The auto-finalize effect observes the COMMITTED status and passes it to
    // requestFinalization, so increments produced earlier in the same event
    // handler (recordCorrect's successes/streak bump from applyAnswerOutcome,
    // session-phase.ts) reach the persisted record alongside the
    // questionsCompleted bump. Under real React batching, both updaters apply
    // before the auto-finalize useEffect observes the new status, so the
    // record built from `status.session` has both increments.
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "structured", totalQuestions: 1 });
    });

    // The single answer triggers both:
    //   - recordCorrect (successes/currentStreak/bestStreak ++)
    //   - recordQuestionAdvanced (questionsCompleted ++ to 1, hits limit)
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });

    expect(result.current.status.phase).toBe("summary");
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

    const { result, rerender } = renderHook(
      (props: SessionRenderProps) =>
        useSession({
          mode: props.mode ?? "flashcard",
          stackKey: props.stackKey ?? "mnemonica",
        }),
      { initialProps: {} as SessionRenderProps }
    );

    act(() => {
      result.current.startSession({ type: "structured", totalQuestions: 1 });
    });
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });
    // Drive several rerenders past threshold; auto-finalize must only
    // request finalize on the first one.
    rerender({});
    rerender({});
    rerender({});
    rerender({});

    // Phase remained active because the write failed.
    expect(result.current.status.phase).toBe("active");
    // Despite the threshold staying met across multiple renders,
    // finalizeSession was attempted exactly once.
    expect(mockFinalizeSession).toHaveBeenCalledOnce();
  });

  it("returns to idle when stopping an open session with fewer than 3 questions", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    // Answer only 2 questions (below threshold of 3 for open sessions)
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });
    act(() => {
      result.current.handleAnswer({ correct: true, questionAdvanced: true });
    });
    expect(result.current.activeSession?.questionsCompleted).toBe(2);

    // Stop the session -- should discard and return to idle
    act(() => {
      result.current.stopSession();
    });

    expect(result.current.status.phase).toBe("idle");
    expect(mockBuildSessionRecord).not.toHaveBeenCalled();
    expect(mockSaveSessionRecord).not.toHaveBeenCalled();
  });

  it("persists and shows summary when stopping an open session with 3 or more questions", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    // Answer 3 questions (meets minimum threshold for open sessions)
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.handleAnswer({ correct: true, questionAdvanced: true });
      });
    }
    expect(result.current.activeSession?.questionsCompleted).toBe(3);

    act(() => {
      result.current.stopSession();
    });

    expect(result.current.status.phase).toBe("summary");
    expect(mockBuildSessionRecord).toHaveBeenCalled();
    expect(mockSaveSessionRecord).toHaveBeenCalled();
    expect(mockComputeSessionSummary).toHaveBeenCalled();
    expect(mockUpdateAllTimeStats).toHaveBeenCalled();
    expect(mockEventBusEmit.SESSION_COMPLETED).toHaveBeenCalled();
  });

  it("dismissSummary returns to idle from summary phase", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "structured", totalQuestions: 10 });
    });

    // Complete a structured session to reach summary phase
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.handleAnswer({ correct: true, questionAdvanced: true });
      });
    }

    expect(result.current.status.phase).toBe("summary");

    act(() => {
      result.current.dismissSummary();
    });

    expect(result.current.status.phase).toBe("idle");
    expect(result.current.activeSession).toBeNull();
  });

  it("startNewSession dismisses summary and starts a new session with the same config", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "flashcard", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "structured", totalQuestions: 10 });
    });

    // Complete a structured session to reach summary phase
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.handleAnswer({ correct: true, questionAdvanced: true });
      });
    }

    expect(result.current.status.phase).toBe("summary");

    act(() => {
      result.current.startNewSession();
    });

    expect(result.current.status.phase).toBe("active");
    expect(result.current.activeSession).not.toBeNull();
    expect(result.current.activeSession?.config).toEqual({
      type: "structured",
      totalQuestions: 10,
    });
    // Should be a fresh session with zero counters
    expect(result.current.activeSession?.successes).toBe(0);
    expect(result.current.activeSession?.fails).toBe(0);
    expect(result.current.activeSession?.questionsCompleted).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Distance mode
  // -----------------------------------------------------------------------

  it("starts a distance session with explicit distanceMode and distanceConvention", () => {
    const { result } = renderHook(
      (props: DistanceRenderProps) =>
        useSession({
          mode: "distance",
          stackKey: "mnemonica",
          distanceMode: props.distanceMode,
          distanceConvention: props.distanceConvention,
        }),
      {
        initialProps: {
          distanceMode: "compute" as DistanceMode,
          distanceConvention: "signed" as DistanceConvention,
        },
      }
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    expect(result.current.status.phase).toBe("active");
    expect(result.current.activeSession?.mode).toBe("distance");
    if (result.current.activeSession?.mode === "distance") {
      expect(result.current.activeSession.distanceMode).toBe("compute");
      expect(result.current.activeSession.distanceConvention).toBe("signed");
    }
  });

  it("falls back to default distanceMode and distanceConvention when undefined", () => {
    const { result } = renderHook(() =>
      useSession({ mode: "distance", stackKey: "mnemonica" })
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    expect(result.current.activeSession?.mode).toBe("distance");
    if (result.current.activeSession?.mode === "distance") {
      expect(result.current.activeSession.distanceMode).toBe("both");
      expect(result.current.activeSession.distanceConvention).toBe("cyclic");
    }
  });

  it("emits SESSION_STARTED with mode 'distance'", () => {
    const { result } = renderHook(() =>
      useSession({
        mode: "distance",
        stackKey: "mnemonica",
        distanceMode: "apply",
        distanceConvention: "cyclic",
      })
    );

    act(() => {
      result.current.startSession({ type: "structured", totalQuestions: 10 });
    });

    expect(mockEventBusEmit.SESSION_STARTED).toHaveBeenCalledWith({
      mode: "distance",
      config: { type: "structured", totalQuestions: 10 },
    });
  });

  // -----------------------------------------------------------------------
  // Mid-session stackLimits re-snapshot
  // -----------------------------------------------------------------------

  it("re-snapshots stackLimits in the active session when limits change mid-session", () => {
    const limitsA = DEFAULT_STACK_LIMITS;
    const limitsB: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };

    const { result, rerender } = renderHook(
      ({ stackLimits }: { stackLimits: StackLimits }) =>
        useSession({
          mode: "flashcard",
          stackKey: "mnemonica",
          stackLimits,
        }),
      { initialProps: { stackLimits: limitsA } }
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });
    expect(result.current.activeSession?.stackLimits).toEqual(limitsA);

    rerender({ stackLimits: limitsB });

    expect(result.current.activeSession?.stackLimits).toEqual(limitsB);
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

    const { result, rerender } = renderHook(
      ({ stackLimits }: { stackLimits: StackLimits }) =>
        useSession({
          mode: "flashcard",
          stackKey: "mnemonica",
          stackLimits,
        }),
      { initialProps: { stackLimits: limits } }
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });
    const sessionBefore = result.current.activeSession;
    expect(sessionBefore?.stackLimits).toEqual(limits);

    // Re-render with a DIFFERENT object identity but identical start/end.
    // The structural-equality early-return should prevent any setStatus.
    rerender({ stackLimits: sameLimitsNewRef });

    expect(result.current.activeSession).toBe(sessionBefore);
  });

  it("does not fire the re-snapshot effect while phase is idle", () => {
    const limitsA = DEFAULT_STACK_LIMITS;
    const limitsB: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };

    const { result, rerender } = renderHook(
      ({ stackLimits }: { stackLimits: StackLimits }) =>
        useSession({
          mode: "flashcard",
          stackKey: "mnemonica",
          stackLimits,
        }),
      { initialProps: { stackLimits: limitsA } }
    );

    expect(result.current.status.phase).toBe("idle");

    rerender({ stackLimits: limitsB });

    expect(result.current.status.phase).toBe("idle");
    expect(result.current.activeSession).toBeNull();
  });

  it("patches a queued pendingFinalizationRef when limits change after stopSession", () => {
    const limitsA = DEFAULT_STACK_LIMITS;
    const limitsB: StackLimits = {
      start: createDeckPosition(1),
      end: createDeckPosition(20),
    };

    const { result, rerender } = renderHook(
      ({ stackLimits }: { stackLimits: StackLimits }) =>
        useSession({
          mode: "flashcard",
          stackKey: "mnemonica",
          stackLimits,
        }),
      { initialProps: { stackLimits: limitsA } }
    );

    act(() => {
      result.current.startSession({ type: "open" });
    });

    // Reach the auto-save threshold so stopSession will queue finalization
    // rather than just returning to idle.
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.handleAnswer({ correct: true, questionAdvanced: true });
      });
    }

    // Stop and change limits within the same act() so the re-snapshot effect
    // patches the queued pendingFinalizationRef before the flush effect runs.
    act(() => {
      result.current.stopSession();
      rerender({ stackLimits: limitsB });
    });

    expect(result.current.status.phase).toBe("summary");
    // The persisted record should reflect the new limits, not the old ones.
    const calls = mockBuildSessionRecord.mock.calls;
    const finalizedSession = calls.at(-1)?.[0];
    expect(finalizedSession?.stackLimits).toEqual(limitsB);
  });

  // -----------------------------------------------------------------------
  // Flush effect — persistence failure surfacing
  // -----------------------------------------------------------------------

  describe("flush effect — persistence failure surfacing", () => {
    /** Drive a session through Stop after answering 3 questions. */
    const runStopFlow = (result: {
      current: ReturnType<typeof useSession>;
    }) => {
      act(() => {
        result.current.startSession({ type: "open" });
      });
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleAnswer({
            correct: true,
            questionAdvanced: true,
          });
        });
      }
      act(() => {
        result.current.stopSession();
      });
    };

    it("shows the generic save-failed notification and keeps phase active when finalize returns write-failed", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "write-failed",
      });
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      runStopFlow(result);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "red",
          title: "errors.sessionSaveFailed.title",
          message: "errors.sessionSaveFailed.message",
        })
      );
      // Phase stays active so the user can retry Stop after clearing storage.
      expect(result.current.status.phase).toBe("active");
      // Every finalize failure reports to analytics — the auto-save cleanup
      // path reports unconditionally and asymmetry here was undercounting
      // user-Stop quota failures in GA.
      // write-failed shares the LocalDbWriteFailed GA bucket with useLocalDb's
      // write path — see reportSessionPersistenceFailed. `name` IS the GA
      // `action` dimension, so it's the discriminator the fix exists to set.
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "LocalDbWriteFailed",
          message: "reason=write-failed",
        }),
        "useSession:flush"
      );
    });

    it("shows the corrupt-storage notification and reports analytics when finalize returns corrupt", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "corrupt",
      });
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      runStopFlow(result);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "red",
          title: "errors.sessionStorageCorrupt.title",
          message: "errors.sessionStorageCorrupt.message",
        })
      );
      // corrupt = two failed writes (stats write + history rollback), so it
      // also lands in the LocalDbWriteFailed bucket.
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "LocalDbWriteFailed",
          message: "reason=corrupt",
        }),
        "useSession:flush"
      );
      // Phase stays active but the session id was added to finalizedIds so
      // a Stop retry doesn't re-show the notification — the user must clear
      // storage to recover.
      expect(result.current.status.phase).toBe("active");
    });

    it("shows the corrupt-storage notification when finalize returns corrupt-prior-state (refused to overwrite)", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "corrupt-prior-state",
      });
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      runStopFlow(result);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "red",
          title: "errors.sessionStorageCorrupt.title",
        })
      );
      // corrupt-prior-state involved no failed write (we refused to overwrite),
      // so it gets the distinct LocalDbPersistenceFailed name rather than
      // inflating the write-failure bucket.
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "LocalDbPersistenceFailed",
          message: "reason=corrupt-prior-state",
        }),
        "useSession:flush"
      );
    });

    it("reports analytics on serialize-failed but uses the generic notification (recoverable bucket)", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "serialize-failed",
      });
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      runStopFlow(result);

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "errors.sessionSaveFailed.title",
        })
      );
      // serialize-failed is a JSON.stringify failure — no write was attempted,
      // so it shares the LocalDbPersistenceFailed name, not LocalDbWriteFailed.
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "LocalDbPersistenceFailed",
          message: "reason=serialize-failed",
        }),
        "useSession:flush"
      );
    });
  });

  // -----------------------------------------------------------------------
  // last-save-failed breadcrumb on mount
  // -----------------------------------------------------------------------

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

      renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

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

      renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

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

      const { rerender } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );
      // Re-render multiple times: latch must keep the notification idempotent
      // even though the breadcrumb read keeps returning a value.
      rerender();
      rerender();

      const lastSaveFailedShows = mockNotificationsShow.mock.calls.filter(
        (call) => call[0]?.title === "errors.lastSaveFailed.title"
      );
      expect(lastSaveFailedShows).toHaveLength(1);
    });

    it("suppresses the notification when the sentinel already matches the breadcrumb's failedAt (across-mount loop fix, issue #629)", () => {
      mockReadBreadcrumb.mockReturnValueOnce({
        reason: "write-failed",
        failedAt: "2025-01-01T00:00:00.000Z",
      });
      mockHasNotifShown.mockReturnValueOnce(true);

      renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

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

      renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

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

      renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      expect(mockHasNotifShown).toHaveBeenCalledWith(failedAt);
    });
  });

  // -----------------------------------------------------------------------
  // Flush effect — language-change isolation (M7)
  // -----------------------------------------------------------------------

  describe("flush effect — language-change isolation (M7)", () => {
    it("does not re-finalize a completed session on a language change re-render", () => {
      // Run a full Stop flow so finalize succeeds and the session id is in
      // finalizedIdsRef. A subsequent re-render that would have happened
      // because `t` changed identity (language change) must not re-fire
      // finalize. Pre-fix, the flush effect's dep list included `t`, so a
      // language change would re-run the effect — pendingFinalizationRef is
      // cleared so it would no-op for the queue, but the test pins the
      // observable invariant: no extra finalize calls.
      const { result, rerender } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      act(() => {
        result.current.startSession({ type: "open" });
      });
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleAnswer({
            correct: true,
            questionAdvanced: true,
          });
        });
      }
      act(() => {
        result.current.stopSession();
      });
      expect(result.current.status.phase).toBe("summary");
      const finalizeCallsAfterStop = mockFinalizeSession.mock.calls.length;

      // Simulate a language-change re-render (additional rerenders).
      rerender();
      rerender();

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
