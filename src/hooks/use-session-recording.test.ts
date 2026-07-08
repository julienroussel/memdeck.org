import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode, useEffect, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { makeActiveSession } from "../test-utils/session-factories";
import type { ActiveSession, SessionPhase } from "../types/session";
import { useSessionRecording } from "./use-session-recording";

const useTestHarness = (initialSession: ActiveSession) => {
  const [status, setStatus] = useState<SessionPhase>({
    phase: "active",
    session: initialSession,
  });
  const recording = useSessionRecording({ setStatus });
  return { recording, status };
};

// Replaces the prior `as { phase: "active"; session: ActiveSession }` cast
// pattern across this file. `asserts` lets the compiler narrow the
// discriminated `SessionPhase` union without an `as` cast.
function assertActive(
  status: SessionPhase
): asserts status is { phase: "active"; session: ActiveSession } {
  if (status.phase !== "active") {
    throw new Error("expected active phase");
  }
}

describe("useSessionRecording", () => {
  describe("recordCorrect", () => {
    it("increments successes and currentStreak", () => {
      const { result } = renderHook(() => useTestHarness(makeActiveSession()));

      act(() => {
        result.current.recording.recordCorrect();
      });

      const { status } = result.current;
      assertActive(status);
      expect(status.session.successes).toBe(1);
      expect(status.session.currentStreak).toBe(1);
    });

    it("updates bestStreak when the current streak exceeds the previous best", () => {
      const { result } = renderHook(() =>
        useTestHarness(makeActiveSession({ bestStreak: 4, currentStreak: 4 }))
      );

      act(() => {
        result.current.recording.recordCorrect();
      });

      const { status } = result.current;
      assertActive(status);
      expect(status.session.currentStreak).toBe(5);
      expect(status.session.bestStreak).toBe(5);
    });

    it("does not lower bestStreak when currentStreak is below it", () => {
      const { result } = renderHook(() =>
        useTestHarness(makeActiveSession({ bestStreak: 10, currentStreak: 0 }))
      );

      act(() => {
        result.current.recording.recordCorrect();
      });

      const { status } = result.current;
      assertActive(status);
      expect(status.session.currentStreak).toBe(1);
      expect(status.session.bestStreak).toBe(10);
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

      const { status } = result.current;
      assertActive(status);
      expect(status.session.fails).toBe(1);
      expect(status.session.currentStreak).toBe(0);
    });

    it("preserves bestStreak when resetting currentStreak", () => {
      const { result } = renderHook(() =>
        useTestHarness(makeActiveSession({ bestStreak: 8, currentStreak: 5 }))
      );

      act(() => {
        result.current.recording.recordIncorrect();
      });

      const { status } = result.current;
      assertActive(status);
      expect(status.session.currentStreak).toBe(0);
      expect(status.session.bestStreak).toBe(8);
    });
  });

  describe("recordQuestionAdvanced", () => {
    it("increments questionsCompleted", () => {
      const { result } = renderHook(() => useTestHarness(makeActiveSession()));

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      const { status } = result.current;
      assertActive(status);
      expect(status.session.questionsCompleted).toBe(1);
    });

    it("accumulates a recordCorrect bump and a recordQuestionAdvanced bump from the same event", () => {
      // Same-event invariant: applyAnswerOutcome (session-phase.ts) calls
      // recordCorrect() then recordQuestionAdvanced() inside one handler.
      // Both updaters must apply via the queued `prev`, so the next render's
      // status reflects BOTH the success/streak bump AND the questionsCompleted
      // bump. End-to-end finalization of this batched state is covered by the
      // auto-finalize effect tests in use-session.test.ts.
      const { result } = renderHook(() => useTestHarness(makeActiveSession()));

      act(() => {
        result.current.recording.recordCorrect();
        result.current.recording.recordQuestionAdvanced();
      });

      const { status } = result.current;
      assertActive(status);
      expect(status.session.successes).toBe(1);
      expect(status.session.currentStreak).toBe(1);
      expect(status.session.bestStreak).toBe(1);
      expect(status.session.questionsCompleted).toBe(1);
    });

    it("setters remain idempotent under StrictMode re-render (committed state matches single-invoke)", () => {
      // Smoke test: drives the setters under React 19 StrictMode and verifies
      // committed state matches the non-StrictMode case (single increment per
      // call, not double). It does NOT pin internal-updater purity — under
      // StrictMode React invokes the updater body twice but discards the
      // second return value, so an impure-updater regression that mutates a
      // closure variable would still produce identical committed state and
      // pass this test. Closure-write purity is enforced by source review and
      // the absence of any closure variables in useSessionRecording, not by
      // this test. The next test ("dedupe-ref pattern …") covers the
      // architectural piece that replaced useSetStateWithSideEffect.
      const { result } = renderHook(() => useTestHarness(makeActiveSession()), {
        wrapper: ({ children }) => createElement(StrictMode, null, children),
      });

      act(() => {
        result.current.recording.recordCorrect();
      });
      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      const { status } = result.current;
      assertActive(status);
      expect(status.session.successes).toBe(1);
      expect(status.session.currentStreak).toBe(1);
      expect(status.session.bestStreak).toBe(1);
      expect(status.session.questionsCompleted).toBe(1);
    });

    it("dedupe-ref pattern: useEffect-driven side effect fires exactly once under StrictMode", () => {
      // Pins the architectural pattern that replaced useSetStateWithSideEffect
      // (production site: use-session.ts auto-finalize useEffect). Under
      // React 19 StrictMode dev-mode mount, the effect runs twice (mount →
      // simulated unmount → re-mount). A useRef-backed Set persists across
      // the cycle so the second run short-circuits via `has()`; the
      // production code at use-session.ts:401-417 uses exactly this shape
      // with `requestedFinalizationIdsRef` keyed on session.id.
      //
      // A regression that removed the dedupe check entirely, or used a
      // per-render variable instead of cross-render persistent storage, would
      // let the effect fire twice under StrictMode. This test catches that.
      // Note: a `useState<Set>` substitution would NOT be caught here —
      // useState also persists across StrictMode's mount→unmount→remount.
      const onSideEffect = vi.fn();

      const useDedupedEffect = () => {
        const requestedRef = useRef(new Set<string>());
        useEffect(() => {
          const id = "session-1";
          if (requestedRef.current.has(id)) {
            return;
          }
          requestedRef.current.add(id);
          onSideEffect(id);
        }, []);
      };

      renderHook(() => useDedupedEffect(), {
        wrapper: ({ children }) => createElement(StrictMode, null, children),
      });

      expect(onSideEffect).toHaveBeenCalledExactlyOnceWith("session-1");
    });
  });

  describe("when phase is not active", () => {
    it("recordCorrect is a no-op when phase is idle", () => {
      const { result } = renderHook(() => {
        const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
        const recording = useSessionRecording({ setStatus });
        return { recording, status };
      });

      act(() => {
        result.current.recording.recordCorrect();
      });

      expect(result.current.status.phase).toBe("idle");
    });

    it("recordIncorrect is a no-op when phase is idle", () => {
      const { result } = renderHook(() => {
        const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
        const recording = useSessionRecording({ setStatus });
        return { recording, status };
      });

      act(() => {
        result.current.recording.recordIncorrect();
      });

      expect(result.current.status.phase).toBe("idle");
    });

    it("recordQuestionAdvanced is a no-op when phase is idle", () => {
      const { result } = renderHook(() => {
        const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
        const recording = useSessionRecording({ setStatus });
        return { recording, status };
      });

      act(() => {
        result.current.recording.recordQuestionAdvanced();
      });

      expect(result.current.status.phase).toBe("idle");
    });
  });
});
