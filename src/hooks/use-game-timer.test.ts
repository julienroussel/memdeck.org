import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerDuration } from "../types/timer";
import { timerReducerCases, useGameTimer } from "./use-game-timer";

describe("timerReducerCases", () => {
  describe("TICK", () => {
    it("decrements timeRemaining by 1", () => {
      const state = { other: "data", timeRemaining: 10 };
      const result = timerReducerCases.TICK(state);

      expect(result.timeRemaining).toBe(9);
      expect(result.other).toBe("data");
    });

    it("does not go below 0", () => {
      const state = { timeRemaining: 0 };
      const result = timerReducerCases.TICK(state);

      expect(result.timeRemaining).toBe(0);
    });

    it("handles timeRemaining of 1 correctly", () => {
      const state = { timeRemaining: 1 };
      const result = timerReducerCases.TICK(state);

      expect(result.timeRemaining).toBe(0);
    });

    it("preserves other state properties", () => {
      const state = {
        name: "test",
        score: 100,
        timeRemaining: 15,
        timerDuration: 30,
      };
      const result = timerReducerCases.TICK(state);

      expect(result).toEqual({
        name: "test",
        score: 100,
        timeRemaining: 14,
        timerDuration: 30,
      });
    });
  });

  describe("RESET_TIMER", () => {
    it("updates both timeRemaining and timerDuration", () => {
      const state = { other: "data", timeRemaining: 5, timerDuration: 15 };
      const result = timerReducerCases.RESET_TIMER(state, 30);

      expect(result.timeRemaining).toBe(30);
      expect(result.timerDuration).toBe(30);
      expect(result.other).toBe("data");
    });

    it("resets to a shorter duration", () => {
      const state = { timeRemaining: 20, timerDuration: 30 };
      const result = timerReducerCases.RESET_TIMER(state, 10);

      expect(result.timeRemaining).toBe(10);
      expect(result.timerDuration).toBe(10);
    });

    it("preserves other state properties", () => {
      const state = {
        name: "test",
        score: 100,
        timeRemaining: 5,
        timerDuration: 15,
      };
      const result = timerReducerCases.RESET_TIMER(state, 30);

      expect(result).toEqual({
        name: "test",
        score: 100,
        timeRemaining: 30,
        timerDuration: 30,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// useGameTimer hook tests using @testing-library/react renderHook
// ---------------------------------------------------------------------------

type HookProps = {
  enabled: boolean;
  duration: TimerDuration;
  timeRemaining: number;
  onTimeout?: () => void;
  roundKey?: object;
};

const DEFAULT_ROUND = { round: 1 };

describe("useGameTimer hook effects", () => {
  const mockDispatch = vi.fn();
  const mockCreateTimeoutAction = vi.fn(() => ({ type: "TIMEOUT" as const }));
  const mockOnTimeout = vi.fn();

  const renderTimerHook = (props: HookProps) =>
    renderHook(
      ({
        enabled,
        duration,
        timeRemaining,
        onTimeout,
        roundKey = DEFAULT_ROUND,
      }: HookProps) =>
        useGameTimer({
          createTimeoutAction: mockCreateTimeoutAction,
          dispatch: mockDispatch,
          onTimeout,
          roundKey,
          timeRemaining,
          timerSettings: { duration, enabled },
        }),
      { initialProps: props }
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("duration sync effect", () => {
    it("dispatches RESET_TIMER with the initial duration", () => {
      renderTimerHook({ duration: 30, enabled: true, timeRemaining: 30 });

      expect(mockDispatch).toHaveBeenCalledWith({
        payload: { duration: 30 },
        type: "RESET_TIMER",
      });
    });

    it("dispatches RESET_TIMER when duration changes", () => {
      const { rerender } = renderTimerHook({
        duration: 30,
        enabled: true,
        timeRemaining: 30,
      });
      mockDispatch.mockClear();

      rerender({ duration: 15, enabled: true, timeRemaining: 30 });

      expect(mockDispatch).toHaveBeenCalledWith({
        payload: { duration: 15 },
        type: "RESET_TIMER",
      });
    });

    it("does not re-run duration sync effect when only enabled changes", () => {
      const { rerender } = renderTimerHook({
        duration: 30,
        enabled: false,
        timeRemaining: 30,
      });
      mockDispatch.mockClear();

      rerender({ duration: 30, enabled: true, timeRemaining: 30 });

      expect(mockDispatch).not.toHaveBeenCalledWith({
        payload: { duration: 30 },
        type: "RESET_TIMER",
      });
    });
  });

  describe("timer tick effect", () => {
    it("restarts the tick when the duration changes to the time already left", () => {
      const { rerender } = renderTimerHook({
        duration: 15,
        enabled: true,
        timeRemaining: 10,
      });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(900);
      });
      rerender({ duration: 10, enabled: true, timeRemaining: 10 });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(mockDispatch).not.toHaveBeenCalledWith({ type: "TICK" });

      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
    });

    it("keeps the pending tick when re-rendered with the same round", () => {
      const round = { round: 1 };
      const { rerender } = renderTimerHook({
        duration: 5,
        enabled: true,
        roundKey: round,
        timeRemaining: 5,
      });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(900);
      });
      rerender({
        duration: 5,
        enabled: true,
        roundKey: round,
        timeRemaining: 5,
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
    });

    it("restarts the tick when a new round starts before the first tick", () => {
      const { rerender } = renderTimerHook({
        duration: 5,
        enabled: true,
        roundKey: { round: 1 },
        timeRemaining: 5,
      });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(900);
      });
      rerender({
        duration: 5,
        enabled: true,
        roundKey: { round: 2 },
        timeRemaining: 5,
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(mockDispatch).not.toHaveBeenCalledWith({ type: "TICK" });

      act(() => {
        vi.advanceTimersByTime(900);
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
    });

    it("dispatches TICK after 1 second when timer is enabled and time remaining is positive", () => {
      renderTimerHook({ duration: 30, enabled: true, timeRemaining: 30 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
    });

    it("does not dispatch TICK when timer is disabled", () => {
      renderTimerHook({ duration: 30, enabled: false, timeRemaining: 30 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("does not dispatch TICK when timeRemaining is 0", () => {
      renderTimerHook({ duration: 30, enabled: true, timeRemaining: 0 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("does not dispatch TICK when timeRemaining is negative", () => {
      renderTimerHook({ duration: 30, enabled: true, timeRemaining: -1 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("clears timeout on unmount", () => {
      const { unmount } = renderTimerHook({
        duration: 30,
        enabled: true,
        timeRemaining: 30,
      });
      mockDispatch.mockClear();

      unmount();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("dispatches TICK repeatedly as timeRemaining decrements", () => {
      const { rerender } = renderTimerHook({
        duration: 10,
        enabled: true,
        timeRemaining: 3,
      });
      mockDispatch.mockClear();

      // First tick
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
      mockDispatch.mockClear();

      // Simulate timeRemaining decrement via re-render
      rerender({ duration: 10, enabled: true, timeRemaining: 2 });
      mockDispatch.mockClear();

      // Second tick
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
      mockDispatch.mockClear();

      // Simulate timeRemaining decrement via re-render
      rerender({ duration: 10, enabled: true, timeRemaining: 1 });
      mockDispatch.mockClear();

      // Third tick
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
    });
  });

  describe("timer timeout effect", () => {
    it("dispatches timeout action when timer reaches 0 and is enabled", () => {
      renderTimerHook({ duration: 30, enabled: true, timeRemaining: 0 });

      expect(mockDispatch).toHaveBeenCalledWith({ type: "TIMEOUT" });
    });

    it("calls onTimeout callback when timer reaches 0 and is enabled", () => {
      renderTimerHook({
        duration: 30,
        enabled: true,
        onTimeout: mockOnTimeout,
        timeRemaining: 0,
      });

      expect(mockOnTimeout).toHaveBeenCalledOnce();
    });

    it("does not dispatch timeout action when timer is disabled even if time is 0", () => {
      renderTimerHook({ duration: 30, enabled: false, timeRemaining: 0 });

      expect(mockDispatch).not.toHaveBeenCalledWith({ type: "TIMEOUT" });
    });

    it("does not call onTimeout when timer is disabled even if time is 0", () => {
      renderTimerHook({
        duration: 30,
        enabled: false,
        onTimeout: mockOnTimeout,
        timeRemaining: 0,
      });

      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it("does not dispatch timeout action when timeRemaining is positive", () => {
      renderTimerHook({ duration: 30, enabled: true, timeRemaining: 1 });

      expect(mockDispatch).not.toHaveBeenCalledWith({ type: "TIMEOUT" });
    });

    it("does not call onTimeout when timeRemaining is positive", () => {
      renderTimerHook({
        duration: 30,
        enabled: true,
        onTimeout: mockOnTimeout,
        timeRemaining: 1,
      });

      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it("handles onTimeout being undefined", () => {
      renderTimerHook({ duration: 30, enabled: true, timeRemaining: 0 });

      // Should not throw
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TIMEOUT" });
    });

    it("invokes onTimeout BEFORE dispatching the timeout action", () => {
      // Consumers (e.g. distance) emit analytics + session-fail counters in
      // onTimeout and rely on the next-round payload coming from dispatch
      // afterwards. Pinning the order here so a future refactor cannot
      // silently flip it without a failing test.
      const callOrder: Array<"onTimeout" | "dispatch"> = [];
      const dispatched: Array<{ type: string }> = [];
      const orderedDispatch = vi.fn((action: { type: string }) => {
        dispatched.push(action);
        callOrder.push("dispatch");
      });
      const orderedOnTimeout = vi.fn(() => {
        callOrder.push("onTimeout");
      });

      renderHook(() =>
        useGameTimer({
          createTimeoutAction: () => ({ type: "TIMEOUT" as const }),
          dispatch: orderedDispatch,
          onTimeout: orderedOnTimeout,
          roundKey: DEFAULT_ROUND,
          timeRemaining: 0,
          timerSettings: { duration: 30, enabled: true },
        })
      );

      // The duration-sync effect also fires on mount and dispatches
      // RESET_TIMER, but that runs in a separate effect and is allowed to
      // interleave. Filter to just the timeout-effect call.
      const timeoutDispatches = dispatched.filter(
        (action) => action.type === "TIMEOUT"
      );
      expect(timeoutDispatches).toHaveLength(1);
      expect(orderedOnTimeout).toHaveBeenCalledOnce();
      // onTimeout must appear before the TIMEOUT dispatch in the call order.
      const onTimeoutIdx = callOrder.indexOf("onTimeout");
      const dispatchIdx = callOrder.lastIndexOf("dispatch");
      expect(onTimeoutIdx).toBeGreaterThanOrEqual(0);
      expect(onTimeoutIdx).toBeLessThan(dispatchIdx);
    });
  });
});
