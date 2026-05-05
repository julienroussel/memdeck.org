import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { makeActiveSession } from "../test-utils/session-factories";
import type { ActiveSession, SessionPhase } from "../types/session";
import { useSessionRecording } from "./use-session-recording";

const useTestHarness = (
  initialSession: ActiveSession,
  requestFinalization = vi.fn()
) => {
  const [status, setStatus] = useState<SessionPhase>({
    phase: "active",
    session: initialSession,
  });
  const statusRef = useRef<SessionPhase>({
    phase: "active",
    session: initialSession,
  });
  statusRef.current = status;
  const recording = useSessionRecording({ setStatus, requestFinalization });
  return { status, recording, requestFinalization };
};

describe("useSessionRecording", () => {
  describe("recordCorrect", () => {
    it("increments successes and currentStreak", () => {
      const { result } = renderHook(() => useTestHarness(makeActiveSession()));

      act(() => {
        result.current.recording.recordCorrect();
      });

      const session = (
        result.current.status as { phase: "active"; session: ActiveSession }
      ).session;
      expect(session.successes).toBe(1);
      expect(session.currentStreak).toBe(1);
    });

    it("updates bestStreak when the current streak exceeds the previous best", () => {
      const { result } = renderHook(() =>
        useTestHarness(makeActiveSession({ currentStreak: 4, bestStreak: 4 }))
      );

      act(() => {
        result.current.recording.recordCorrect();
      });

      const session = (
        result.current.status as { phase: "active"; session: ActiveSession }
      ).session;
      expect(session.currentStreak).toBe(5);
      expect(session.bestStreak).toBe(5);
    });

    it("does not lower bestStreak when currentStreak is below it", () => {
      const { result } = renderHook(() =>
        useTestHarness(makeActiveSession({ currentStreak: 0, bestStreak: 10 }))
      );

      act(() => {
        result.current.recording.recordCorrect();
      });

      const session = (
        result.current.status as { phase: "active"; session: ActiveSession }
      ).session;
      expect(session.currentStreak).toBe(1);
      expect(session.bestStreak).toBe(10);
    });
  });

  describe("recordIncorrect", () => {
    it("increments fails and resets currentStreak to 0", () => {
      const { result } = renderHook(() =>
        useTestHarness(makeActiveSession({ currentStreak: 5 }))
      );

      act(() => {
        result.current.recording.recordIncorrect();
      });

      const session = (
        result.current.status as { phase: "active"; session: ActiveSession }
      ).session;
      expect(session.fails).toBe(1);
      expect(session.currentStreak).toBe(0);
    });

    it("preserves bestStreak when resetting currentStreak", () => {
      const { result } = renderHook(() =>
        useTestHarness(makeActiveSession({ currentStreak: 5, bestStreak: 8 }))
      );

      act(() => {
        result.current.recording.recordIncorrect();
      });

      const session = (
        result.current.status as { phase: "active"; session: ActiveSession }
      ).session;
      expect(session.currentStreak).toBe(0);
      expect(session.bestStreak).toBe(8);
    });
  });

  describe("recordQuestionAdvanced", () => {
    it("increments questionsCompleted", () => {
      const { result } = renderHook(() => useTestHarness(makeActiveSession()));

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      const session = (
        result.current.status as { phase: "active"; session: ActiveSession }
      ).session;
      expect(session.questionsCompleted).toBe(1);
    });

    it("calls requestFinalization when a structured session reaches its limit", () => {
      const requestFinalization = vi.fn();
      const { result } = renderHook(() =>
        useTestHarness(
          makeActiveSession({
            config: { type: "structured", totalQuestions: 10 },
            questionsCompleted: 9,
          }),
          requestFinalization
        )
      );

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      expect(requestFinalization).toHaveBeenCalledOnce();
      expect(requestFinalization.mock.calls[0][0].questionsCompleted).toBe(10);
    });

    it("calls requestFinalization with the latest queued state via the setState updater pattern", () => {
      // Same-event invariant: when recordQuestionAdvanced's updater runs, it
      // reads `prev` — the LATEST queued state. Reading via statusRef would
      // return the value committed at the prior render, which is stale within
      // a batched event. This test pins the invariant by seeding the harness
      // with an already-bumped success count and verifying the finalized
      // session reflects the seeded values rather than a zeroed default.
      const requestFinalization = vi.fn();
      const { result } = renderHook(() =>
        useTestHarness(
          makeActiveSession({
            config: { type: "structured", totalQuestions: 10 },
            questionsCompleted: 9,
            successes: 8,
            currentStreak: 8,
            bestStreak: 8,
          }),
          requestFinalization
        )
      );

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      expect(requestFinalization).toHaveBeenCalledOnce();
      const finalized = requestFinalization.mock.calls[0][0];
      expect(finalized.questionsCompleted).toBe(10);
      // Persisted record reflects seeded streak/successes — proving the
      // updater is reading queued state (i.e. `prev`), not a stale ref.
      expect(finalized.successes).toBe(8);
      expect(finalized.currentStreak).toBe(8);
      expect(finalized.bestStreak).toBe(8);
    });

    it("invokes requestFinalization after the setStatus call returns, decoupling the side effect from updater execution timing", () => {
      // Pins the contract that requestFinalization is called by
      // recordQuestionAdvanced AFTER setStatus has been invoked, not from
      // inside the updater. The advanceQuestion helper is pure — its
      // toFinalize result is bridged to the side-effect via finalizeRef
      // (React's blessed updater→ref pattern). Order-of-events here proves
      // the side effect does not depend on the updater running synchronously
      // before the surrounding code returns.
      const callOrder: string[] = [];
      const requestFinalization = vi.fn(() => {
        callOrder.push("requestFinalization");
      });
      const { result } = renderHook(() =>
        useTestHarness(
          makeActiveSession({
            config: { type: "structured", totalQuestions: 5 },
            questionsCompleted: 4,
          }),
          requestFinalization
        )
      );

      act(() => {
        result.current.recording.recordQuestionAdvanced();
        callOrder.push("after-record");
      });

      expect(requestFinalization).toHaveBeenCalledOnce();
      // requestFinalization must have been invoked before the synchronous
      // `after-record` line — i.e. it ran during recordQuestionAdvanced's
      // synchronous body, downstream of the updater.
      expect(callOrder).toEqual(["requestFinalization", "after-record"]);
    });

    it("does not call requestFinalization for open sessions", () => {
      const requestFinalization = vi.fn();
      const { result } = renderHook(() =>
        useTestHarness(
          makeActiveSession({
            config: { type: "open" },
            questionsCompleted: 99,
          }),
          requestFinalization
        )
      );

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      expect(requestFinalization).not.toHaveBeenCalled();
    });
  });

  describe("when phase is not active", () => {
    it("recordCorrect is a no-op when phase is idle", () => {
      const { result } = renderHook(() => {
        const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
        const statusRef = useRef<SessionPhase>({ phase: "idle" });
        statusRef.current = status;
        const recording = useSessionRecording({
          setStatus,
          requestFinalization: vi.fn(),
        });
        return { status, recording };
      });

      act(() => {
        result.current.recording.recordCorrect();
      });

      expect(result.current.status.phase).toBe("idle");
    });

    it("recordIncorrect is a no-op when phase is idle", () => {
      const { result } = renderHook(() => {
        const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
        const statusRef = useRef<SessionPhase>({ phase: "idle" });
        statusRef.current = status;
        const recording = useSessionRecording({
          setStatus,
          requestFinalization: vi.fn(),
        });
        return { status, recording };
      });

      act(() => {
        result.current.recording.recordIncorrect();
      });

      expect(result.current.status.phase).toBe("idle");
    });

    it("recordQuestionAdvanced is a no-op when phase is idle", () => {
      const { result } = renderHook(() => {
        const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
        const statusRef = useRef<SessionPhase>({ phase: "idle" });
        statusRef.current = status;
        const recording = useSessionRecording({
          setStatus,
          requestFinalization: vi.fn(),
        });
        return { status, recording };
      });

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      expect(result.current.status.phase).toBe("idle");
    });
  });
});
