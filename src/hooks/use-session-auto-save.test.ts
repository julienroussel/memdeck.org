import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeActiveSession,
  makeSummary,
} from "../test-utils/session-factories";
import type {
  ActiveSession,
  SessionPhase,
  SessionSummary,
} from "../types/session";
import type { StackKey } from "../types/stacks";
import { useSessionAutoSave } from "./use-session-auto-save";

// ---------------------------------------------------------------------------
// Test harness — wraps useSessionAutoSave with real React state/refs so we
// can inspect phase transitions from the outside.
// ---------------------------------------------------------------------------

type HarnessProps = {
  stackKey: StackKey;
  initialPhase: SessionPhase;
  tryFinalizeSession: (session: ActiveSession) => SessionSummary | null;
};

const useTestHarness = ({
  stackKey,
  initialPhase,
  tryFinalizeSession,
}: HarnessProps) => {
  const [status, setStatus] = useState<SessionPhase>(initialPhase);
  const statusRef = useRef<SessionPhase>(status);
  statusRef.current = status;

  useSessionAutoSave({
    stackKey,
    statusRef,
    setStatus,
    tryFinalizeSession,
  });

  return { status, statusRef };
};

describe("useSessionAutoSave", () => {
  const mockSummary = makeSummary();
  const mockTryFinalizeSession =
    vi.fn<(session: ActiveSession) => SessionSummary | null>();

  beforeEach(() => {
    mockTryFinalizeSession.mockReset();
    mockTryFinalizeSession.mockReturnValue(mockSummary);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Auto-save on stack change
  // -----------------------------------------------------------------------

  describe("auto-save on stack change", () => {
    it("finalizes the session when stack changes and session meets minimum threshold", () => {
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "active", session: activeSession },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).toHaveBeenCalledWith(activeSession);
      expect(result.current.status).toEqual({
        phase: "summary",
        summary: mockSummary,
      });
    });

    it("resets to idle when stack changes and active session is below minimum threshold", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 1,
      });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "active", session: activeSession },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.status).toEqual({ phase: "idle" });
    });

    it("does nothing when the stack key does not change", () => {
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "active", session: activeSession },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "mnemonica" as StackKey });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.status.phase).toBe("active");
    });

    it("does nothing when stack changes but phase is idle", () => {
      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "idle" },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.status.phase).toBe("idle");
    });

    it("does nothing when stack changes but phase is summary", () => {
      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "summary", summary: mockSummary },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.status.phase).toBe("summary");
    });

    it("keeps phase as active when tryFinalizeSession returns null on stack change", () => {
      mockTryFinalizeSession.mockReturnValue(null);

      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "active", session: activeSession },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).toHaveBeenCalledWith(activeSession);
      // When tryFinalizeSession returns null, the hook does not call
      // setStatus, so the phase remains active.
      expect(result.current.status.phase).toBe("active");
    });

    it("finalizes a structured session with 1 question completed on stack change", () => {
      const activeSession = makeActiveSession({
        config: { type: "structured", totalQuestions: 10 },
        questionsCompleted: 1,
      });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "active", session: activeSession },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).toHaveBeenCalledWith(activeSession);
      expect(result.current.status).toEqual({
        phase: "summary",
        summary: mockSummary,
      });
    });

    it("resets to idle for open session with exactly 2 questions on stack change", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 2,
      });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "active", session: activeSession },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.status).toEqual({ phase: "idle" });
    });

    it("finalizes for open session with exactly 3 questions on stack change", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 3,
      });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            stackKey,
            initialPhase: { phase: "active", session: activeSession },
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).toHaveBeenCalledWith(activeSession);
      expect(result.current.status).toEqual({
        phase: "summary",
        summary: mockSummary,
      });
    });
  });

  // -----------------------------------------------------------------------
  // Auto-save on beforeunload
  // -----------------------------------------------------------------------

  describe("auto-save on beforeunload", () => {
    it("finalizes session when beforeunload fires and session meets threshold", () => {
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "active", session: activeSession },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockTryFinalizeSession).toHaveBeenCalledWith(activeSession);
    });

    it("does not finalize on beforeunload when session is below threshold", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 1,
      });

      renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "active", session: activeSession },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
    });

    it("does not finalize on beforeunload when phase is idle", () => {
      renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "idle" },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
    });

    it("does not finalize on beforeunload when phase is summary", () => {
      renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "summary", summary: mockSummary },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Auto-save on unmount
  // -----------------------------------------------------------------------

  describe("auto-save on unmount", () => {
    it("finalizes session on unmount when session meets threshold", () => {
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "active", session: activeSession },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(mockTryFinalizeSession).toHaveBeenCalledWith(activeSession);
    });

    it("does not finalize on unmount when session is below threshold", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 1,
      });

      const { unmount } = renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "active", session: activeSession },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
    });

    it("does not finalize on unmount when phase is idle", () => {
      const { unmount } = renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "idle" },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
    });

    it("removes the beforeunload listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          stackKey: "mnemonica",
          initialPhase: { phase: "active", session: activeSession },
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
    });
  });
});
