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
import { createElement, type ReactNode, StrictMode } from "react";
import { MemoryRouter, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_TIME_STATS_LSK,
  LAST_SAVE_FAILED_LSK,
  SESSION_HISTORY_LSK,
} from "../constants";
import type { DistanceConvention, DistanceMode } from "../types/distance";
import { type FlashcardMode, isFlashcardMode } from "../types/flashcard";
import type {
  ActiveSession,
  AllTimeStats,
  SessionRecord,
} from "../types/session";
import { DEFAULT_STACK_LIMITS, type StackLimits } from "../types/stack-limits";
import { createDeckPosition, type StackKey } from "../types/stacks";
import type { SessionCheckpoint } from "../utils/session-persistence";
// Imported via the `use-session` re-export — pins the public type surface of
// the hook (status phase) as the contract these tests assert against.
import type { SessionPhase } from "./use-session";
import { tryHandler, useSuggestionDeepLink } from "./use-suggestion-deep-link";

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
  FLASHCARD_ANSWER: vi.fn(),
  FLASHCARD_MODE_CHANGED: vi.fn(),
  SESSION_COMPLETED: vi.fn(),
  SESSION_STARTED: vi.fn(),
  STACK_SELECTED: vi.fn(),
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
  (
    session: ActiveSession,
    _checkpoint?: SessionCheckpoint
  ): MockFinalizeResult => {
    const record = mockBuildSessionRecord(session);
    mockSaveSessionRecord(record);
    const history = mockReadSessionHistory();
    const allTimeStats = mockReadAllTimeStats();
    const summary = mockComputeSessionSummary(record, history, allTimeStats);
    mockUpdateAllTimeStats(record);
    mockEventBusEmit.SESSION_COMPLETED({
      accuracy: record.accuracy,
      mode: record.mode,
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
    finalizeSession: (session: ActiveSession, checkpoint?: SessionCheckpoint) =>
      mockFinalizeSession(session, checkpoint),
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
const mockWriteBreadcrumb = vi.fn();
const mockClearBreadcrumbForSession = vi.fn();
vi.mock("../utils/session-breadcrumbs", () => ({
  clearLastSaveFailedBreadcrumb: () => mockClearBreadcrumb(),
  clearLastSaveFailedBreadcrumbForSession: (sessionId: string) =>
    mockClearBreadcrumbForSession(sessionId),
  hasLastSaveFailedNotificationBeenShown: (failedAt: string) =>
    mockHasNotifShown(failedAt),
  markLastSaveFailedNotificationShown: (failedAt: string) =>
    mockMarkNotifShown(failedAt),
  readLastSaveFailedBreadcrumb: () => mockReadBreadcrumb(),
  writeLastSaveFailedBreadcrumb: (...args: unknown[]) =>
    mockWriteBreadcrumb(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Dynamic imports after mocks are wired up (vi.mock is hoisted above these)
const { useSession } = await import("./use-session");
const { buildSessionRecord } = await import("../utils/session-persistence");
const { finalizeSession: actualFinalizeSession } = await vi.importActual<
  typeof import("../utils/session-persistence")
>("../utils/session-persistence");
const { deriveFeatureUsage } = await import("../utils/feature-usage");
const actualBreadcrumbs = await vi.importActual<
  typeof import("../utils/session-breadcrumbs")
>("../utils/session-breadcrumbs");

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
        uuidCounter += 1;
        return `test-uuid-${uuidCounter}`;
      },
    });

    // Default mock return values for finalization helpers
    mockBuildSessionRecord.mockImplementation((session: ActiveSession) => ({
      accuracy:
        session.successes + session.fails > 0
          ? session.successes / (session.successes + session.fails)
          : 0,
      bestStreak: session.bestStreak,
      config: session.config,
      durationSeconds: 600,
      endedAt: "2025-01-01T00:10:00.000Z",
      fails: session.fails,
      id: session.id,
      mode: session.mode,
      questionsCompleted: session.questionsCompleted,
      stackKey: session.stackKey,
      startedAt: session.startedAt,
      successes: session.successes,
    }));
    mockReadSessionHistory.mockReturnValue([]);
    mockReadAllTimeStats.mockReturnValue({});
    mockComputeSessionSummary.mockImplementation((record: unknown) => ({
      encouragement: "Nice!",
      isAccuracyImprovement: false,
      isNewGlobalBestStreak: false,
      previousAverageAccuracy: null,
      record,
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
      config: { type: "open" },
      mode: "flashcard",
    });
  });

  it("auto-starts an open session on mount when autoStart is true", () => {
    const { result } = renderHook(() =>
      useSession({ autoStart: true, mode: "flashcard", stackKey: "mnemonica" })
    );

    const { status } = result.current;
    assertPhase(status, "active");
    expect(status.session.config).toEqual({ type: "open" });
  });

  it("does not auto-start when autoStart is false", () => {
    const { result } = renderHook(() =>
      useSession({ autoStart: false, mode: "flashcard", stackKey: "mnemonica" })
    );

    expect(result.current.status.phase).toBe("idle");
  });

  it("auto-starts when autoStart flips false to true (deep-link consumed on an already-mounted page)", () => {
    // The post-session "Try it" (#698): the page is already mounted, the user
    // dismisses the summary (back to idle), then a fresh ?try= arrives
    // (autoStart false while pending) and is stripped (autoStart true). The flip
    // must start a session in the now-preselected variant — initialMountRef has
    // long since been consumed, so it alone would never re-fire.
    const { result, rerender } = renderHook(
      ({ autoStart }: { autoStart: boolean }) =>
        useSession({ autoStart, mode: "flashcard", stackKey: "mnemonica" }),
      { initialProps: { autoStart: false } }
    );
    expect(result.current.status.phase).toBe("idle");

    rerender({ autoStart: true });

    assertPhase(result.current.status, "active");
  });

  it("does not auto-restart after Stop returns to idle (autoStart unchanged is not a re-arm)", () => {
    const { result } = renderHook(() =>
      useSession({ autoStart: true, mode: "flashcard", stackKey: "mnemonica" })
    );
    assertPhase(result.current.status, "active");

    // Stop an open session with fewer than 3 questions: discards and returns to
    // idle. autoStart stays true, but with no false→true flip the session must
    // NOT auto-restart — otherwise Stop would be unusable on an auto-start page.
    act(() => {
      result.current.stopSession();
    });

    expect(result.current.status.phase).toBe("idle");
  });

  it("re-arms auto-start across the real deep-link cascade (summary 'Try it', #698)", () => {
    // The rerender test above flushes effects between renders, which can mask the
    // production timing: the summary "Try it" batches the idle transition
    // (dismiss) AND the ?try= navigation into ONE commit (autoStart → false),
    // then useSuggestionDeepLink's layout effect strips the param (autoStart →
    // true) before paint. `justArmed` only fires if React flushes the
    // autoStart=false commit's passive effect before the strip's re-render. This
    // composes the REAL useSession + useSuggestionDeepLink (exactly as a mode
    // page wires them) and drives the whole cascade inside a SINGLE act() — one
    // user click — so React's real effect ordering, not the test harness,
    // decides the outcome.
    const noop = () => {
      // Mode application itself is covered in use-suggestion-deep-link.test.tsx;
      // here we only assert the autoStart edge restarts the session.
    };
    // StrictMode mirrors main.tsx (the app's real root) so the effect
    // double-invoke is exercised, not just assumed: the re-arm must stay
    // idempotent even though the auto-start effect has no cleanup and runs twice
    // on mount under StrictMode.
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        StrictMode,
        null,
        createElement(
          MemoryRouter,
          { initialEntries: ["/flashcard/"] },
          children
        )
      );

    const { result } = renderHook(
      () => {
        const navigate = useNavigate();
        const deepLinkPending = useSuggestionDeepLink({
          tryHandlers: [tryHandler(isFlashcardMode, noop)],
        });
        const sessionApi = useSession({
          autoStart: !deepLinkPending,
          mode: "flashcard",
          stackKey: "mnemonica",
        });
        return { navigate, sessionApi };
      },
      { wrapper }
    );

    // Mount auto-starts (autoStart true, no params on the URL).
    assertPhase(result.current.sessionApi.status, "active");
    const firstId = result.current.sessionApi.status.session.id;

    // One click: stop the current session (→ idle; < 3 questions is discarded)
    // AND navigate to the same-page deep link — exactly handleTryIt's batched
    // dismiss + Link navigation.
    act(() => {
      result.current.sessionApi.stopSession();
      result.current.navigate("/flashcard/?try=neighbor");
    });

    // The autoStart false→true edge must have started a *new* open session.
    assertPhase(result.current.sessionApi.status, "active");
    expect(result.current.sessionApi.status.session.id).not.toBe(firstId);
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
      result.current.startSession({ totalQuestions: 10, type: "structured" });
    });

    // Answer 9 questions (one short of completion)
    for (let i = 0; i < 9; i += 1) {
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
      result.current.startSession({ totalQuestions: 1, type: "structured" });
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
        bestStreak: 1,
        currentStreak: 1,
        questionsCompleted: 1,
        successes: 1,
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
      { initialProps: {} }
    );

    act(() => {
      result.current.startSession({ totalQuestions: 1, type: "structured" });
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
    for (let i = 0; i < 3; i += 1) {
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
      result.current.startSession({ totalQuestions: 10, type: "structured" });
    });

    // Complete a structured session to reach summary phase
    for (let i = 0; i < 10; i += 1) {
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
      result.current.startSession({ totalQuestions: 10, type: "structured" });
    });

    // Complete a structured session to reach summary phase
    for (let i = 0; i < 10; i += 1) {
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
      totalQuestions: 10,
      type: "structured",
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
          distanceConvention: props.distanceConvention,
          distanceMode: props.distanceMode,
          mode: "distance",
          stackKey: "mnemonica",
        }),
      {
        initialProps: {
          distanceConvention: "signed",
          distanceMode: "compute",
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
        distanceConvention: "cyclic",
        distanceMode: "apply",
        mode: "distance",
        stackKey: "mnemonica",
      })
    );

    act(() => {
      result.current.startSession({ totalQuestions: 10, type: "structured" });
    });

    expect(mockEventBusEmit.SESSION_STARTED).toHaveBeenCalledWith({
      config: { totalQuestions: 10, type: "structured" },
      mode: "distance",
    });
  });

  // -----------------------------------------------------------------------
  // Mid-session stackLimits re-snapshot
  // -----------------------------------------------------------------------

  it("re-snapshots stackLimits in the active session when limits change mid-session", () => {
    const limitsA = DEFAULT_STACK_LIMITS;
    const limitsB: StackLimits = {
      end: createDeckPosition(20),
      start: createDeckPosition(1),
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
      end: createDeckPosition(20),
      start: createDeckPosition(1),
    };
    const sameLimitsNewRef: StackLimits = {
      end: createDeckPosition(20),
      start: createDeckPosition(1),
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
      end: createDeckPosition(20),
      start: createDeckPosition(1),
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
      end: createDeckPosition(20),
      start: createDeckPosition(1),
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
    for (let i = 0; i < 3; i += 1) {
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
    const { calls } = mockBuildSessionRecord.mock;
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
      for (let i = 0; i < 3; i += 1) {
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
          message: "errors.sessionSaveFailed.message",
          title: "errors.sessionSaveFailed.title",
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
          message: "reason=write-failed",
          name: "LocalDbWriteFailed",
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
          message: "errors.sessionStorageCorrupt.message",
          title: "errors.sessionStorageCorrupt.title",
        })
      );
      // corrupt = two failed writes (stats write + history rollback), so it
      // also lands in the LocalDbWriteFailed bucket.
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "reason=corrupt",
          name: "LocalDbWriteFailed",
        }),
        "useSession:flush"
      );
      // Retry cannot help, so the session ends rather than leaving a Stop
      // control that silently does nothing.
      expect(result.current.status.phase).toBe("idle");
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
          message: "reason=corrupt-prior-state",
          name: "LocalDbPersistenceFailed",
        }),
        "useSession:flush"
      );
    });

    it("ends the session after a corrupt-prior-state failure so Stop is never a silent no-op", () => {
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "corrupt-prior-state",
      });
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      runStopFlow(result);

      expect(result.current.status).toEqual({ phase: "idle" });
      expect(result.current.activeSession).toBeNull();
      expect(mockNotificationsShow).toHaveBeenCalledOnce();

      // A second Stop has no active session to act on and must not retry the
      // corrupt write.
      act(() => {
        result.current.stopSession();
      });
      expect(result.current.status).toEqual({ phase: "idle" });
      expect(mockFinalizeSession).toHaveBeenCalledOnce();
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
          message: "reason=serialize-failed",
          name: "LocalDbPersistenceFailed",
        }),
        "useSession:flush"
      );
    });
  });

  // -----------------------------------------------------------------------
  // startSession — prior-session auto-save failure surfacing
  // -----------------------------------------------------------------------

  describe("startSession — prior-session auto-save failure surfacing", () => {
    /** Start an open session and answer 3 questions so it meets the save threshold. */
    const runSessionPastSaveThreshold = (result: {
      current: ReturnType<typeof useSession>;
    }) => {
      act(() => {
        result.current.startSession({ type: "open" });
      });
      for (let i = 0; i < 3; i += 1) {
        act(() => {
          result.current.handleAnswer({
            correct: true,
            questionAdvanced: true,
          });
        });
      }
    };

    it("shows the yellow save-failed notification and reports analytics when auto-saving the prior session fails with write-failed", () => {
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      runSessionPastSaveThreshold(result);

      // The SECOND startSession auto-saves the prior active session; force
      // that finalize to fail.
      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "write-failed",
      });
      act(() => {
        result.current.startSession({ type: "open" });
      });

      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "reason=write-failed",
          name: "LocalDbWriteFailed",
        }),
        "useSession:startSession"
      );
      // Unlike the flush effect's red toast, the auto-save path uses yellow
      // for recoverable reasons — the prior session is dropped either way
      // (the new one replaces it), so there is no retry to invite.
      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "yellow",
          message: "errors.sessionSaveFailed.message",
          title: "errors.sessionSaveFailed.title",
        })
      );
      // The failure must not block the new session from starting.
      const { status } = result.current;
      assertPhase(status, "active");
      expect(status.session.questionsCompleted).toBe(0);
    });

    it("shows the red corrupt-storage notification when auto-saving the prior session fails with corrupt", () => {
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      runSessionPastSaveThreshold(result);

      mockFinalizeSession.mockReturnValueOnce({
        ok: false,
        reason: "corrupt",
      });
      act(() => {
        result.current.startSession({ type: "open" });
      });

      // corrupt = two failed writes (stats write + history rollback), so it
      // lands in the LocalDbWriteFailed bucket — same as the flush path.
      expect(mockTrackError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "reason=corrupt",
          name: "LocalDbWriteFailed",
        }),
        "useSession:startSession"
      );
      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "red",
          message: "errors.sessionStorageCorrupt.message",
          title: "errors.sessionStorageCorrupt.title",
        })
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
        failedAt: "2025-01-01T00:00:00.000Z",
        reason: "write-failed",
      });

      renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );

      expect(mockNotificationsShow).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "yellow",
          message: "errors.lastSaveFailed.message",
          title: "errors.lastSaveFailed.title",
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
        failedAt: "2025-01-01T00:00:00.000Z",
        reason: "write-failed",
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
        failedAt: "2025-01-01T00:00:00.000Z",
        reason: "write-failed",
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
        failedAt,
        reason: "write-failed",
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
          message: "errors.lastSaveFailed.message",
          title: "errors.lastSaveFailed.title",
        })
      );
    });

    it("queries the sentinel using the breadcrumb's failedAt — pins the keying contract", () => {
      const failedAt = "2025-06-15T08:30:42.123Z";
      mockReadBreadcrumb.mockReturnValueOnce({
        failedAt,
        reason: "serialize-failed",
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
      for (let i = 0; i < 3; i += 1) {
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

  // -----------------------------------------------------------------------
  // Variant change mid-session (sub-mode, timed)
  // -----------------------------------------------------------------------

  describe("variant change mid-session", () => {
    const answerQuestions = (
      result: { current: ReturnType<typeof useSession> },
      count: number
    ) => {
      for (let i = 0; i < count; i += 1) {
        act(() => {
          result.current.handleAnswer({
            correct: true,
            questionAdvanced: true,
          });
        });
      }
    };

    const cardOnlyProps: { flashcardMode: FlashcardMode } = {
      flashcardMode: "cardonly",
    };

    const savedRecords = () =>
      mockFinalizeSession.mock.calls.map(([session]) =>
        buildSessionRecord(session)
      );

    it("saves the questions answered in the first flashcard sub-mode under it and continues in a new session under the second", () => {
      const { result, rerender } = renderHook(
        ({ flashcardMode }: { flashcardMode: FlashcardMode }) =>
          useSession({
            autoStart: true,
            flashcardMode,
            mode: "flashcard",
            stackKey: "mnemonica",
          }),
        { initialProps: cardOnlyProps }
      );

      answerQuestions(result, 3);
      rerender({ flashcardMode: "neighbor" });

      const { status } = result.current;
      assertPhase(status, "active");
      expect(status.session).toMatchObject({
        flashcardMode: "neighbor",
        questionsCompleted: 0,
      });

      answerQuestions(result, 4);
      act(() => {
        result.current.stopSession();
      });

      const records = savedRecords();
      expect(records).toEqual([
        expect.objectContaining({
          flashcardMode: "cardonly",
          questionsCompleted: 3,
        }),
        expect.objectContaining({
          flashcardMode: "neighbor",
          questionsCompleted: 4,
        }),
      ]);
      const usage = deriveFeatureUsage(records);
      expect(usage.flashcardModes.cardonly).toBe(true);
      expect(usage.flashcardModes.neighbor).toBe(true);
    });

    it("saves the untimed questions as untimed and continues timed after the timer is turned on", () => {
      const { result, rerender } = renderHook(
        ({ timed }: { timed: boolean }) =>
          useSession({
            autoStart: true,
            mode: "flashcard",
            stackKey: "mnemonica",
            timed,
          }),
        { initialProps: { timed: false } }
      );

      answerQuestions(result, 3);
      rerender({ timed: true });
      answerQuestions(result, 3);
      act(() => {
        result.current.stopSession();
      });

      const records = savedRecords();
      expect(records).toEqual([
        expect.objectContaining({ questionsCompleted: 3, timed: false }),
        expect.objectContaining({ questionsCompleted: 3, timed: true }),
      ]);
      expect(deriveFeatureUsage(records).timedModes.flashcard).toBe(true);
    });

    it("drops a below-threshold session and restarts under the new sub-mode", () => {
      const { result, rerender } = renderHook(
        ({ flashcardMode }: { flashcardMode: FlashcardMode }) =>
          useSession({
            autoStart: true,
            flashcardMode,
            mode: "flashcard",
            stackKey: "mnemonica",
          }),
        { initialProps: cardOnlyProps }
      );

      answerQuestions(result, 1);
      rerender({ flashcardMode: "numberonly" });

      expect(mockFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.activeSession).toMatchObject({
        flashcardMode: "numberonly",
        questionsCompleted: 0,
      });
    });

    it("does not start a session when the variant changes while idle", () => {
      const { result, rerender } = renderHook(
        ({ flashcardMode }: { flashcardMode: FlashcardMode }) =>
          useSession({
            flashcardMode,
            mode: "flashcard",
            stackKey: "mnemonica",
          }),
        { initialProps: cardOnlyProps }
      );

      rerender({ flashcardMode: "neighbor" });

      expect(result.current.status).toEqual({ phase: "idle" });
    });
  });

  // -----------------------------------------------------------------------
  // Save when the page is hidden
  // -----------------------------------------------------------------------

  describe("save when the page is hidden", () => {
    let visibility: DocumentVisibilityState;
    let visibilitySpy: { mockRestore: () => void };

    beforeEach(() => {
      visibility = "visible";
      visibilitySpy = vi
        .spyOn(document, "visibilityState", "get")
        .mockImplementation(() => visibility);
    });

    afterEach(() => {
      visibilitySpy.mockRestore();
    });

    // happy-dom ignores the `persisted` init field, so pin it on the event.
    const pageHideEvent = (persisted: boolean) => {
      const event = new PageTransitionEvent("pagehide");
      Object.defineProperty(event, "persisted", { value: persisted });
      return event;
    };

    const setVisibility = (next: DocumentVisibilityState) => {
      visibility = next;
      document.dispatchEvent(new Event("visibilitychange"));
    };

    const answerQuestions = (
      result: { current: ReturnType<typeof useSession> },
      count: number
    ) => {
      for (let i = 0; i < count; i += 1) {
        act(() => {
          result.current.handleAnswer({
            correct: true,
            questionAdvanced: true,
          });
        });
      }
    };

    // Real persistence for this block: what matters is what lands on disk
    // (one record, counted once), which a mocked finalizeSession cannot show.
    // checkpointSession is already the real one (see the vi.mock above).
    beforeEach(() => {
      localStorage.clear();
      mockFinalizeSession.mockImplementation(actualFinalizeSession);
    });

    // clearAllMocks keeps implementations, so restore the default one here.
    afterEach(() => {
      mockFinalizeSession.mockReset();
    });

    const readHistory = (): SessionRecord[] =>
      JSON.parse(localStorage.getItem(SESSION_HISTORY_LSK) ?? "[]");

    const readEntry = () => {
      const stats: AllTimeStats = JSON.parse(
        localStorage.getItem(ALL_TIME_STATS_LSK) ?? "{}"
      );
      return stats["flashcard:mnemonica"];
    };

    it("hide, return, then Stop saves one record with the combined count, counted once", () => {
      const { result } = renderHook(() =>
        useSession({
          autoStart: true,
          mode: "flashcard",
          stackKey: "mnemonica",
        })
      );
      answerQuestions(result, 3);
      const sessionId = result.current.activeSession?.id;
      mockEventBusEmit.SESSION_STARTED.mockClear();

      act(() => {
        setVisibility("hidden");
      });

      // Saved, but still the same running session for the user.
      expect(readHistory()).toHaveLength(1);
      const { status } = result.current;
      assertPhase(status, "active");
      expect(status.session.id).toBe(sessionId);
      expect(status.session.questionsCompleted).toBe(3);
      expect(mockEventBusEmit.SESSION_STARTED).not.toHaveBeenCalled();
      expect(mockEventBusEmit.SESSION_COMPLETED).not.toHaveBeenCalled();

      act(() => {
        setVisibility("visible");
      });
      // A post-return tail under the 3-question minimum still counts.
      answerQuestions(result, 2);
      act(() => {
        result.current.stopSession();
      });

      expect(result.current.status.phase).toBe("summary");
      const history = readHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        id: sessionId,
        questionsCompleted: 5,
      });
      expect(readEntry()).toMatchObject({
        totalQuestions: 5,
        totalSessions: 1,
        totalSuccesses: 5,
      });
      expect(mockEventBusEmit.SESSION_COMPLETED).toHaveBeenCalledOnce();
    });

    it("hide, then the page is killed, leaves one record with the counts at hide time", () => {
      const { result } = renderHook(() =>
        useSession({
          autoStart: true,
          mode: "flashcard",
          stackKey: "mnemonica",
        })
      );
      answerQuestions(result, 4);

      act(() => {
        setVisibility("hidden");
      });
      // Killed: no further event, no unmount (unmount would finalize).

      expect(readHistory()).toHaveLength(1);
      expect(readHistory()[0]).toMatchObject({ questionsCompleted: 4 });
      expect(readEntry()).toMatchObject({
        totalQuestions: 4,
        totalSessions: 1,
      });
    });

    it("two hides then Stop save one record, counted once", () => {
      const { result } = renderHook(() =>
        useSession({
          autoStart: true,
          mode: "flashcard",
          stackKey: "mnemonica",
        })
      );
      answerQuestions(result, 3);
      act(() => {
        setVisibility("hidden");
      });
      act(() => {
        setVisibility("visible");
      });
      answerQuestions(result, 2);
      act(() => {
        setVisibility("hidden");
      });
      act(() => {
        setVisibility("visible");
      });
      answerQuestions(result, 1);
      act(() => {
        result.current.stopSession();
      });

      expect(readHistory()).toHaveLength(1);
      expect(readHistory()[0]).toMatchObject({ questionsCompleted: 6 });
      expect(readEntry()).toMatchObject({
        totalQuestions: 6,
        totalSessions: 1,
      });
    });

    it("saves once when visibilitychange, pagehide and beforeunload all fire for one exit", () => {
      const { result } = renderHook(() =>
        useSession({
          autoStart: true,
          mode: "flashcard",
          stackKey: "mnemonica",
        })
      );
      answerQuestions(result, 3);

      act(() => {
        setVisibility("hidden");
        window.dispatchEvent(new Event("pagehide"));
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockFinalizeSession).toHaveBeenCalledOnce();
      // The hide's checkpoint and the exit's final save are one record.
      expect(readHistory()).toHaveLength(1);
      expect(readEntry()).toMatchObject({
        totalQuestions: 3,
        totalSessions: 1,
      });
    });

    it("does not save a below-threshold open session on hide", () => {
      const { result } = renderHook(() =>
        useSession({
          autoStart: true,
          mode: "flashcard",
          stackKey: "mnemonica",
        })
      );
      answerQuestions(result, 2);

      act(() => {
        setVisibility("hidden");
      });

      expect(mockFinalizeSession).not.toHaveBeenCalled();
    });

    it("saves a structured session on a mere hide and keeps it running unchanged", () => {
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );
      act(() => {
        result.current.startSession({ totalQuestions: 10, type: "structured" });
      });
      answerQuestions(result, 4);
      const before = result.current.activeSession;

      act(() => {
        setVisibility("hidden");
      });
      // Killed here: the structured session is on disk anyway.

      expect(result.current.activeSession).toBe(before);
      expect(readHistory()).toHaveLength(1);
      expect(readHistory()[0]).toMatchObject({
        config: { totalQuestions: 10, type: "structured" },
        questionsCompleted: 4,
      });
      expect(readEntry()).toMatchObject({
        totalQuestions: 4,
        totalSessions: 1,
      });
    });

    it("a structured session saved on hide and then completed is one record, counted once", () => {
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );
      act(() => {
        result.current.startSession({ totalQuestions: 5, type: "structured" });
      });
      answerQuestions(result, 3);
      act(() => {
        setVisibility("hidden");
      });
      act(() => {
        setVisibility("visible");
      });
      answerQuestions(result, 2);

      expect(result.current.status.phase).toBe("summary");
      expect(readHistory()).toHaveLength(1);
      expect(readEntry()).toMatchObject({
        totalQuestions: 5,
        totalSessions: 1,
      });
    });

    it("saves a structured session on a pagehide that is not entering bfcache", () => {
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );
      act(() => {
        result.current.startSession({ totalQuestions: 10, type: "structured" });
      });
      answerQuestions(result, 4);

      act(() => {
        window.dispatchEvent(pageHideEvent(false));
      });

      expect(mockFinalizeSession).toHaveBeenCalledOnce();
      expect(mockFinalizeSession.mock.calls[0]?.[0]).toMatchObject({
        questionsCompleted: 4,
      });
    });

    it("saves a structured session on a pagehide entering bfcache without ending it", () => {
      const { result } = renderHook(() =>
        useSession({ mode: "flashcard", stackKey: "mnemonica" })
      );
      act(() => {
        result.current.startSession({ totalQuestions: 10, type: "structured" });
      });
      answerQuestions(result, 4);

      act(() => {
        window.dispatchEvent(pageHideEvent(true));
      });

      expect(mockFinalizeSession).not.toHaveBeenCalled();
      expect(readHistory()).toHaveLength(1);
      expect(result.current.status.phase).toBe("active");
    });

    describe("last-save-failed breadcrumb", () => {
      // Real breadcrumb writes and clears, so the test sees what the next
      // mount would read.
      beforeEach(() => {
        mockWriteBreadcrumb.mockImplementation(
          actualBreadcrumbs.writeLastSaveFailedBreadcrumb
        );
        mockClearBreadcrumbForSession.mockImplementation(
          actualBreadcrumbs.clearLastSaveFailedBreadcrumbForSession
        );
      });

      afterEach(() => {
        mockWriteBreadcrumb.mockReset();
        mockClearBreadcrumbForSession.mockReset();
      });

      // Fails only the history write, so the breadcrumb write still lands.
      const failHistoryWrites = () => {
        const originalSetItem = localStorage.setItem.bind(localStorage);
        return vi
          .spyOn(localStorage, "setItem")
          .mockImplementation((key: string, value: string) => {
            if (key === SESSION_HISTORY_LSK) {
              throw new DOMException("quota exceeded", "QuotaExceededError");
            }
            originalSetItem(key, value);
          });
      };

      const readBreadcrumb = (): unknown =>
        JSON.parse(localStorage.getItem(LAST_SAVE_FAILED_LSK) ?? "null");

      it("clears the breadcrumb of a failed hide save once Stop saves the session", () => {
        const { result } = renderHook(() =>
          useSession({
            autoStart: true,
            mode: "flashcard",
            stackKey: "mnemonica",
          })
        );
        answerQuestions(result, 3);
        const sessionId = result.current.activeSession?.id;
        const writes = failHistoryWrites();

        act(() => {
          setVisibility("hidden");
        });
        writes.mockRestore();

        expect(readBreadcrumb()).toMatchObject({ sessionId });

        act(() => {
          setVisibility("visible");
        });
        act(() => {
          result.current.stopSession();
        });

        expect(result.current.status.phase).toBe("summary");
        expect(readHistory()).toHaveLength(1);
        expect(localStorage.getItem(LAST_SAVE_FAILED_LSK)).toBeNull();
      });

      it("keeps the breadcrumb of a failed hide save when the page is then killed", () => {
        const { result } = renderHook(() =>
          useSession({
            autoStart: true,
            mode: "flashcard",
            stackKey: "mnemonica",
          })
        );
        answerQuestions(result, 3);
        const sessionId = result.current.activeSession?.id;
        const writes = failHistoryWrites();

        act(() => {
          setVisibility("hidden");
        });
        writes.mockRestore();
        // Killed: no further event, no unmount (unmount would finalize).

        expect(readHistory()).toHaveLength(0);
        expect(readBreadcrumb()).toMatchObject({
          reason: "write-failed",
          sessionId,
        });
      });
    });
  });
});
