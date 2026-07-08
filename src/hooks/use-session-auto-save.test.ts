import { notifications } from "@mantine/notifications";
import { act, renderHook } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../services/analytics";
import {
  makeActiveSession,
  makeSummary,
} from "../test-utils/session-factories";
import type { ActiveSession, SessionPhase } from "../types/session";
import type { StackKey } from "../types/stacks";
import { writeLastSaveFailedBreadcrumb } from "../utils/session-breadcrumbs";
import type { TryFinalizeSessionResult } from "./use-session";
import { useSessionAutoSave } from "./use-session-auto-save";

vi.mock("../services/analytics", () => ({
  analytics: {
    trackError: vi.fn(),
  },
}));

vi.mock("../utils/session-breadcrumbs", () => ({
  writeLastSaveFailedBreadcrumb: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Test harness — wraps useSessionAutoSave with real React state/refs so we
// can inspect phase transitions from the outside.
// ---------------------------------------------------------------------------

type HarnessProps = {
  stackKey: StackKey;
  initialPhase: SessionPhase;
  tryFinalizeSession: (session: ActiveSession) => TryFinalizeSessionResult;
  requestFinalization?: (session: ActiveSession) => void;
};

const useTestHarness = ({
  stackKey,
  initialPhase,
  tryFinalizeSession,
  requestFinalization,
}: HarnessProps) => {
  const [status, setStatus] = useState<SessionPhase>(initialPhase);
  const statusRef = useRef<SessionPhase>(status);
  statusRef.current = status;

  useSessionAutoSave({
    requestFinalization: requestFinalization ?? vi.fn(),
    setStatus,
    stackKey,
    statusRef,
    tryFinalizeSession,
  });

  return { status, statusRef };
};

describe("useSessionAutoSave", () => {
  const mockSummary = makeSummary();
  const mockTryFinalizeSession =
    vi.fn<(session: ActiveSession) => TryFinalizeSessionResult>();

  beforeEach(() => {
    mockTryFinalizeSession.mockReset();
    mockTryFinalizeSession.mockReturnValue({
      status: "finalized",
      summary: mockSummary,
    });
    vi.mocked(analytics.trackError).mockClear();
    vi.mocked(writeLastSaveFailedBreadcrumb).mockClear();
    vi.mocked(notifications.show).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Auto-save on stack change
  // -----------------------------------------------------------------------

  describe("auto-save on stack change", () => {
    it("requests finalization when stack changes and session meets minimum threshold", () => {
      const activeSession = makeActiveSession({ questionsCompleted: 5 });
      const mockRequestFinalization = vi.fn();

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            initialPhase: { phase: "active", session: activeSession },
            requestFinalization: mockRequestFinalization,
            stackKey,
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      // Stack-change auto-save routes through requestFinalization (F2) so the
      // flush effect can surface save failures as a Mantine notification and
      // leave the session active for retry.
      expect(mockRequestFinalization).toHaveBeenCalledWith(activeSession);
      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      // The hook itself does not transition to "summary" — the parent's flush
      // effect does that. Phase stays active here.
      expect(result.current.status.phase).toBe("active");
    });

    it("resets to idle when stack changes and active session is below minimum threshold", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 1,
      });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            initialPhase: { phase: "active", session: activeSession },
            stackKey,
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
            initialPhase: { phase: "active", session: activeSession },
            stackKey,
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
            initialPhase: { phase: "idle" },
            stackKey,
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
            initialPhase: { phase: "summary", summary: mockSummary },
            stackKey,
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.status.phase).toBe("summary");
    });

    it("keeps phase as active after requesting finalization on stack change", () => {
      const activeSession = makeActiveSession({ questionsCompleted: 5 });
      const mockRequestFinalization = vi.fn();

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            initialPhase: { phase: "active", session: activeSession },
            requestFinalization: mockRequestFinalization,
            stackKey,
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockRequestFinalization).toHaveBeenCalledWith(activeSession);
      // The hook does not flip phase away from active; that is the parent's
      // flush effect's job (which also handles persistence-failure rollback).
      expect(result.current.status.phase).toBe("active");
    });

    it("requests finalization for a structured session with 1 question completed on stack change", () => {
      const activeSession = makeActiveSession({
        config: { totalQuestions: 10, type: "structured" },
        questionsCompleted: 1,
      });
      const mockRequestFinalization = vi.fn();

      const { rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            initialPhase: { phase: "active", session: activeSession },
            requestFinalization: mockRequestFinalization,
            stackKey,
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockRequestFinalization).toHaveBeenCalledWith(activeSession);
    });

    it("resets to idle for open session with exactly 2 questions on stack change", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 2,
      });

      const { result, rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            initialPhase: { phase: "active", session: activeSession },
            stackKey,
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
      expect(result.current.status).toEqual({ phase: "idle" });
    });

    it("requests finalization for open session with exactly 3 questions on stack change", () => {
      const activeSession = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: 3,
      });
      const mockRequestFinalization = vi.fn();

      const { rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            initialPhase: { phase: "active", session: activeSession },
            requestFinalization: mockRequestFinalization,
            stackKey,
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      rerender({ stackKey: "aronson" as StackKey });

      expect(mockRequestFinalization).toHaveBeenCalledWith(activeSession);
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
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
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
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
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
          initialPhase: { phase: "idle" },
          stackKey: "mnemonica",
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
          initialPhase: { phase: "summary", summary: mockSummary },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
    });

    it("finalizes the session at most once when beforeunload races a queued stack-change finalization", () => {
      // Realistic interleaving (see F2 + F7):
      //   1. User changes stackKey → `requestFinalization` is queued for the
      //      parent's flush effect.
      //   2. User closes the tab BEFORE that flush effect runs → `beforeunload`
      //      fires and the synchronous `tryFinalizeSession` path runs.
      //   3. In production, `use-session.ts`'s `finalizedIdsRef` dedupes and
      //      the second attempt returns `{ status: "duplicate" }` so the
      //      session is finalized exactly once and no double observability
      //      fires (no double trackError, no double breadcrumb).
      //
      // The harness can't reproduce React's effect/microtask scheduling
      // verbatim — `renderHook` flushes effects synchronously on rerender, so
      // step 2 unavoidably runs AFTER `requestFinalization` has been observed.
      // What we CAN verify is the contract: across both events combined, the
      // hook routes through the dedup-aware persistence layer such that the
      // second call is observed as a no-op (`duplicate`) and no spurious
      // error tracking / breadcrumb / notification fires. A regression that
      // decoupled the two refs (e.g., per-path id tracking) would either
      // double-finalize (trackError fires) or surface a write-failed on the
      // duplicate (breadcrumb fires) — both are asserted against here.
      const activeSession = makeActiveSession({ questionsCompleted: 5 });
      const finalizedIds = new Set<string>();
      const mockRequestFinalization = vi.fn((session: ActiveSession) => {
        // Mirror production: requestFinalization eventually persists via the
        // same path that updates `finalizedIdsRef`, so a subsequent
        // tryFinalizeSession on the same id sees it as already finalized.
        finalizedIds.add(session.id);
      });
      mockTryFinalizeSession.mockImplementation((session: ActiveSession) => {
        if (finalizedIds.has(session.id)) {
          return { status: "duplicate" };
        }
        finalizedIds.add(session.id);
        return { status: "finalized", summary: mockSummary };
      });

      const { rerender } = renderHook(
        ({ stackKey }: { stackKey: StackKey }) =>
          useTestHarness({
            initialPhase: { phase: "active", session: activeSession },
            requestFinalization: mockRequestFinalization,
            stackKey,
            tryFinalizeSession: mockTryFinalizeSession,
          }),
        { initialProps: { stackKey: "mnemonica" as StackKey } }
      );

      // Step 1: stack change queues requestFinalization.
      rerender({ stackKey: "aronson" as StackKey });
      expect(mockRequestFinalization).toHaveBeenCalledTimes(1);
      expect(mockRequestFinalization).toHaveBeenCalledWith(activeSession);

      // Step 2: beforeunload fires before any further flush.
      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      // Contract: across both paths the session is finalized at most once.
      // The synchronous beforeunload path may or may not invoke
      // tryFinalizeSession (depending on internal ordering), but if it does,
      // the second invocation must observe a `duplicate` status — never a
      // fresh `finalized` and never a `write-failed`.
      const finalizeCalls = mockTryFinalizeSession.mock.calls.length;
      expect(finalizeCalls).toBeLessThanOrEqual(1);
      const finalizedResults = mockTryFinalizeSession.mock.results;
      const freshFinalizes = finalizedResults.filter(
        (r) => r.type === "return" && r.value.status === "finalized"
      );
      expect(freshFinalizes).toHaveLength(0);
      // No double observability: no error tracked, no breadcrumb written.
      expect(analytics.trackError).not.toHaveBeenCalled();
      expect(writeLastSaveFailedBreadcrumb).not.toHaveBeenCalled();
      // The session id was recorded exactly once across both paths.
      expect(finalizedIds.size).toBe(1);
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
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
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
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(mockTryFinalizeSession).not.toHaveBeenCalled();
    });

    it("does not finalize on unmount when phase is idle", () => {
      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "idle" },
          stackKey: "mnemonica",
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
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
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

  // -----------------------------------------------------------------------
  // Observability for unmount/beforeunload write failures (F7)
  // -----------------------------------------------------------------------

  describe("observability on unmount/beforeunload", () => {
    it("emits analytics.trackError when tryFinalizeSession returns write-failed on unmount", () => {
      mockTryFinalizeSession.mockReturnValue({
        reason: "write-failed",
        status: "write-failed",
      });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(analytics.trackError).toHaveBeenCalledOnce();
      const [error, context] = vi.mocked(analytics.trackError).mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      // `name` IS GA's `action` dimension — the discriminator the consolidation
      // exists to set. write-failed shares the LocalDbWriteFailed bucket with
      // useLocalDb's write path.
      expect(error.name).toBe("LocalDbWriteFailed");
      expect(error.message).toBe("reason=write-failed");
      // Cleanup path on internal-navigation unmount uses the :cleanup context
      // so triage can split it from real beforeunload (page-close) failures.
      expect(context).toBe("useSessionAutoSave:cleanup");
    });

    it("emits analytics.trackError with corrupt reason when on-disk state is inconsistent", () => {
      mockTryFinalizeSession.mockReturnValue({
        reason: "corrupt",
        status: "write-failed",
      });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(analytics.trackError).toHaveBeenCalledOnce();
      const [error] = vi.mocked(analytics.trackError).mock.calls[0];
      // corrupt = two failed writes (stats write + history rollback), so it
      // also lands in the LocalDbWriteFailed bucket.
      expect(error.name).toBe("LocalDbWriteFailed");
      expect(error.message).toBe("reason=corrupt");
    });

    it("does NOT emit analytics.trackError when tryFinalizeSession returns duplicate", () => {
      mockTryFinalizeSession.mockReturnValue({ status: "duplicate" });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(analytics.trackError).not.toHaveBeenCalled();
    });

    it("does NOT emit analytics.trackError on a successful finalize", () => {
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(analytics.trackError).not.toHaveBeenCalled();
    });

    it("writes the breadcrumb and reports to GA on beforeunload when finalize returns write-failed", () => {
      // Real beforeunload (page closing) cannot show a notification — the
      // hook persists a breadcrumb so the next session start surfaces the
      // failure to the user.
      mockTryFinalizeSession.mockReturnValue({
        reason: "write-failed",
        status: "write-failed",
      });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      act(() => {
        window.dispatchEvent(new Event("beforeunload"));
      });

      expect(writeLastSaveFailedBreadcrumb).toHaveBeenCalledOnce();
      expect(writeLastSaveFailedBreadcrumb).toHaveBeenCalledWith(
        "write-failed"
      );
      // The :beforeUnload context string is the load-bearing GA discriminator
      // that splits page-close failures from the :cleanup path. Assert it here
      // so a regression that swaps/drops it on this branch fails a test — the
      // :cleanup path asserts the symmetric thing in the observability suite.
      expect(analytics.trackError).toHaveBeenCalledOnce();
      const [error, context] = vi.mocked(analytics.trackError).mock.calls[0];
      expect(error.name).toBe("LocalDbWriteFailed");
      expect(error.message).toBe("reason=write-failed");
      expect(context).toBe("useSessionAutoSave:beforeUnload");
    });

    it("does NOT write the last-save-failed breadcrumb on the React-cleanup path even on write-failed", () => {
      // Internal-navigation unmount: the app is still alive and the cleanup
      // path shows a Mantine notification synchronously instead. Writing the
      // breadcrumb here would cause useSession's next mount to show a SECOND
      // notification for the same failure — see the production comment.
      mockTryFinalizeSession.mockReturnValue({
        reason: "write-failed",
        status: "write-failed",
      });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(writeLastSaveFailedBreadcrumb).not.toHaveBeenCalled();
    });

    it("shows a yellow Mantine notification with the save-failed title on the React-cleanup path", () => {
      mockTryFinalizeSession.mockReturnValue({
        reason: "write-failed",
        status: "write-failed",
      });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(notifications.show).toHaveBeenCalledOnce();
      const [[call]] = vi.mocked(notifications.show).mock.calls;
      expect(call.color).toBe("yellow");
      // i18n is initialised in vitest.setup.ts, so `t` returns the resolved
      // English string for the save-failed title key.
      expect(call.title).toBe("Save failed");
    });

    it("shows a red Mantine notification with the storage-corrupt title when reason is corrupt", () => {
      mockTryFinalizeSession.mockReturnValue({
        reason: "corrupt",
        status: "write-failed",
      });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(notifications.show).toHaveBeenCalledOnce();
      const [[call]] = vi.mocked(notifications.show).mock.calls;
      expect(call.color).toBe("red");
      // i18n-resolved English string for errors.sessionStorageCorrupt.title.
      expect(call.title).toBe("Stored data looks corrupted");
    });

    it("shows a red Mantine notification when reason is corrupt-prior-state", () => {
      mockTryFinalizeSession.mockReturnValue({
        reason: "corrupt-prior-state",
        status: "write-failed",
      });
      const activeSession = makeActiveSession({ questionsCompleted: 5 });

      const { unmount } = renderHook(() =>
        useTestHarness({
          initialPhase: { phase: "active", session: activeSession },
          stackKey: "mnemonica",
          tryFinalizeSession: mockTryFinalizeSession,
        })
      );

      unmount();

      expect(notifications.show).toHaveBeenCalledOnce();
      const [[call]] = vi.mocked(notifications.show).mock.calls;
      expect(call.color).toBe("red");
      // i18n-resolved English string for errors.sessionStorageCorrupt.title.
      expect(call.title).toBe("Stored data looks corrupted");
    });
  });
});
