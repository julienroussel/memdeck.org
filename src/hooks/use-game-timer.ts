import { useEffect, useRef } from "react";
import type { TimerSettings } from "../types/timer";

type TimerAction =
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } };

type UseGameTimerOptions<TTimeoutAction> = {
  timerSettings: TimerSettings;
  timeRemaining: number;
  dispatch: (action: TimerAction | TTimeoutAction) => void;
  createTimeoutAction: () => TTimeoutAction;
  onTimeout?: () => void;
};

/**
 * Shared hook for game timer logic.
 * Handles timer tick, duration sync, and timeout effects.
 *
 * @param options.timerSettings - Current timer settings (enabled, duration)
 * @param options.timeRemaining - Current time remaining from game state
 * @param options.dispatch - Dispatch function for TICK, RESET_TIMER, and timeout actions
 * @param options.createTimeoutAction - Factory function to create the timeout action
 * @param options.onTimeout - Optional callback when timeout occurs (for side effects like notifications)
 */
export const useGameTimer = <TTimeoutAction>({
  timerSettings,
  timeRemaining,
  dispatch,
  createTimeoutAction,
  onTimeout,
}: UseGameTimerOptions<TTimeoutAction>): void => {
  // Use ref to get latest createTimeoutAction without adding to effect dependencies
  const createTimeoutActionRef = useRef(createTimeoutAction);
  createTimeoutActionRef.current = createTimeoutAction;

  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Handle timer duration changes from settings
  useEffect(() => {
    dispatch({
      type: "RESET_TIMER",
      payload: { duration: timerSettings.duration },
    });
  }, [timerSettings.duration, dispatch]);

  // Timer tick effect
  useEffect(() => {
    if (!timerSettings.enabled || timeRemaining <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      dispatch({ type: "TICK" });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [timerSettings.enabled, timeRemaining, dispatch]);

  // Handle timeout - only triggers when timer reaches 0
  useEffect(() => {
    if (!timerSettings.enabled || timeRemaining > 0) {
      return;
    }

    onTimeoutRef.current?.();
    dispatch(createTimeoutActionRef.current());
  }, [timerSettings.enabled, timeRemaining, dispatch]);
};

/**
 * Reducer cases for timer actions.
 * Use these in your game reducer to handle TICK and RESET_TIMER actions.
 */
export const timerReducerCases = {
  TICK: <TState extends { timeRemaining: number }>(state: TState): TState => ({
    ...state,
    timeRemaining: Math.max(0, state.timeRemaining - 1),
  }),

  RESET_TIMER: <
    TState extends { timeRemaining: number; timerDuration: number },
  >(
    state: TState,
    duration: number
  ): TState => ({
    ...state,
    timeRemaining: duration,
    timerDuration: duration,
  }),
};
