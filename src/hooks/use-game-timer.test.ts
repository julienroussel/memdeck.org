import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerDuration } from "../types/timer";
import { timerReducerCases, useGameTimer } from "./use-game-timer";

describe("timerReducerCases", () => {
  describe("TICK", () => {
    it("decrements timeRemaining by 1", () => {
      const state = { timeRemaining: 10, other: "data" };
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
        timeRemaining: 15,
        timerDuration: 30,
        score: 100,
        name: "test",
      };
      const result = timerReducerCases.TICK(state);

      expect(result).toEqual({
        timeRemaining: 14,
        timerDuration: 30,
        score: 100,
        name: "test",
      });
    });
  });

  describe("RESET_TIMER", () => {
    it("updates both timeRemaining and timerDuration", () => {
      const state = { timeRemaining: 5, timerDuration: 15, other: "data" };
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
        timeRemaining: 5,
        timerDuration: 15,
        score: 100,
        name: "test",
      };
      const result = timerReducerCases.RESET_TIMER(state, 30);

      expect(result).toEqual({
        timeRemaining: 30,
        timerDuration: 30,
        score: 100,
        name: "test",
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
};

describe("useGameTimer hook effects", () => {
  const mockDispatch = vi.fn();
  const mockCreateTimeoutAction = vi.fn(() => ({ type: "TIMEOUT" as const }));
  const mockOnTimeout = vi.fn();

  const renderTimerHook = (props: HookProps) =>
    renderHook(
      ({ enabled, duration, timeRemaining, onTimeout }: HookProps) =>
        useGameTimer({
          timerSettings: { enabled, duration },
          timeRemaining,
          dispatch: mockDispatch,
          createTimeoutAction: mockCreateTimeoutAction,
          onTimeout,
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
      renderTimerHook({ enabled: true, duration: 30, timeRemaining: 30 });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "RESET_TIMER",
        payload: { duration: 30 },
      });
    });

    it("dispatches RESET_TIMER when duration changes", () => {
      const { rerender } = renderTimerHook({
        enabled: true,
        duration: 30,
        timeRemaining: 30,
      });
      mockDispatch.mockClear();

      rerender({ enabled: true, duration: 15, timeRemaining: 30 });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "RESET_TIMER",
        payload: { duration: 15 },
      });
    });

    it("does not re-run duration sync effect when only enabled changes", () => {
      const { rerender } = renderTimerHook({
        enabled: false,
        duration: 30,
        timeRemaining: 30,
      });
      mockDispatch.mockClear();

      rerender({ enabled: true, duration: 30, timeRemaining: 30 });

      expect(mockDispatch).not.toHaveBeenCalledWith({
        type: "RESET_TIMER",
        payload: { duration: 30 },
      });
    });
  });

  describe("timer tick effect", () => {
    it("dispatches TICK after 1 second when timer is enabled and time remaining is positive", () => {
      renderTimerHook({ enabled: true, duration: 30, timeRemaining: 30 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
    });

    it("does not dispatch TICK when timer is disabled", () => {
      renderTimerHook({ enabled: false, duration: 30, timeRemaining: 30 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("does not dispatch TICK when timeRemaining is 0", () => {
      renderTimerHook({ enabled: true, duration: 30, timeRemaining: 0 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("does not dispatch TICK when timeRemaining is negative", () => {
      renderTimerHook({ enabled: true, duration: 30, timeRemaining: -1 });
      mockDispatch.mockClear();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("clears timeout on unmount", () => {
      const { unmount } = renderTimerHook({
        enabled: true,
        duration: 30,
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
        enabled: true,
        duration: 10,
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
      rerender({ enabled: true, duration: 10, timeRemaining: 2 });
      mockDispatch.mockClear();

      // Second tick
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TICK" });
      mockDispatch.mockClear();

      // Simulate timeRemaining decrement via re-render
      rerender({ enabled: true, duration: 10, timeRemaining: 1 });
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
      renderTimerHook({ enabled: true, duration: 30, timeRemaining: 0 });

      expect(mockDispatch).toHaveBeenCalledWith({ type: "TIMEOUT" });
    });

    it("calls onTimeout callback when timer reaches 0 and is enabled", () => {
      renderTimerHook({
        enabled: true,
        duration: 30,
        timeRemaining: 0,
        onTimeout: mockOnTimeout,
      });

      expect(mockOnTimeout).toHaveBeenCalledOnce();
    });

    it("does not dispatch timeout action when timer is disabled even if time is 0", () => {
      renderTimerHook({ enabled: false, duration: 30, timeRemaining: 0 });

      expect(mockDispatch).not.toHaveBeenCalledWith({ type: "TIMEOUT" });
    });

    it("does not call onTimeout when timer is disabled even if time is 0", () => {
      renderTimerHook({
        enabled: false,
        duration: 30,
        timeRemaining: 0,
        onTimeout: mockOnTimeout,
      });

      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it("does not dispatch timeout action when timeRemaining is positive", () => {
      renderTimerHook({ enabled: true, duration: 30, timeRemaining: 1 });

      expect(mockDispatch).not.toHaveBeenCalledWith({ type: "TIMEOUT" });
    });

    it("does not call onTimeout when timeRemaining is positive", () => {
      renderTimerHook({
        enabled: true,
        duration: 30,
        timeRemaining: 1,
        onTimeout: mockOnTimeout,
      });

      expect(mockOnTimeout).not.toHaveBeenCalled();
    });

    it("handles onTimeout being undefined", () => {
      renderTimerHook({ enabled: true, duration: 30, timeRemaining: 0 });

      // Should not throw
      expect(mockDispatch).toHaveBeenCalledWith({ type: "TIMEOUT" });
    });
  });
});
