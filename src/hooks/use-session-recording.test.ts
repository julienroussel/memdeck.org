import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { makeActiveSession } from "../test-utils/session-factories";
import type { ActiveSession, SessionPhase } from "../types/session";
import { useSessionRecording } from "./use-session-recording";

const useTestHarness = (initialSession: ActiveSession) => {
  const [status, setStatus] = useState<SessionPhase>({
    phase: "active",
    session: initialSession,
  });
  const pendingFinalizationRef = useRef<ActiveSession | null>(null);
  const recording = useSessionRecording({ setStatus, pendingFinalizationRef });
  return { status, recording, pendingFinalizationRef };
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

    it("sets pendingFinalizationRef when a structured session reaches its limit", () => {
      const { result } = renderHook(() =>
        useTestHarness(
          makeActiveSession({
            config: { type: "structured", totalQuestions: 10 },
            questionsCompleted: 9,
          })
        )
      );

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      expect(result.current.pendingFinalizationRef.current).not.toBeNull();
      expect(
        result.current.pendingFinalizationRef.current?.questionsCompleted
      ).toBe(10);
    });

    it("does not set pendingFinalizationRef for open sessions", () => {
      const { result } = renderHook(() =>
        useTestHarness(
          makeActiveSession({
            config: { type: "open" },
            questionsCompleted: 99,
          })
        )
      );

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      expect(result.current.pendingFinalizationRef.current).toBeNull();
    });
  });

  describe("when phase is not active", () => {
    it("recordCorrect is a no-op when phase is idle", () => {
      const { result } = renderHook(() => {
        const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
        const pendingFinalizationRef = useRef<ActiveSession | null>(null);
        const recording = useSessionRecording({
          setStatus,
          pendingFinalizationRef,
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
        const pendingFinalizationRef = useRef<ActiveSession | null>(null);
        const recording = useSessionRecording({
          setStatus,
          pendingFinalizationRef,
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
        const pendingFinalizationRef = useRef<ActiveSession | null>(null);
        const recording = useSessionRecording({
          setStatus,
          pendingFinalizationRef,
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
