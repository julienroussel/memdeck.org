import { useEffect, useRef } from "react";
import type { TimerSettings } from "../types/timer";

type TimerAction =
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } };

type UseGameTimerOptions<TTimeoutAction extends { type: string }> = {
  timerSettings: TimerSettings;
  timeRemaining: number;
  /**
   * Identity of the current question: a fresh object per round, and the same
   * object for the whole round (a value rebuilt on every render would restart
   * the tick on every render and freeze the countdown). A new round
   * restarts the 1-second tick even when `timeRemaining` resets to the value it
   * already had, so an answer before the first tick does not shorten the next round.
   */
  roundKey: object;
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
 * @param options.roundKey - Current question object; a new one restarts the tick
 * @param options.dispatch - Dispatch function for TICK, RESET_TIMER, and timeout actions
 * @param options.createTimeoutAction - Factory function to create the timeout action
 * @param options.onTimeout - Optional callback when timeout occurs (for side effects like notifications)
 */
export const useGameTimer = <TTimeoutAction extends { type: string }>({
  timerSettings,
  timeRemaining,
  roundKey,
  dispatch,
  createTimeoutAction,
  onTimeout,
}: UseGameTimerOptions<TTimeoutAction>): void => {
  // Use ref to get latest createTimeoutAction without adding to effect dependencies.
  // Synced in an effect declared before the timeout effect, not during render.
  const createTimeoutActionRef = useRef(createTimeoutAction);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    createTimeoutActionRef.current = createTimeoutAction;
    onTimeoutRef.current = onTimeout;
  }, [createTimeoutAction, onTimeout]);

  // Handle timer duration changes from settings
  useEffect(() => {
    dispatch({
      payload: { duration: timerSettings.duration },
      type: "RESET_TIMER",
    });
  }, [timerSettings.duration, dispatch]);

  // Timer tick effect
  // biome-ignore lint/correctness/useExhaustiveDependencies: roundKey and duration restart the tick on a new question or a duration change, even when timeRemaining resets to the value it already had
  useEffect(() => {
    if (!timerSettings.enabled || timeRemaining <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      dispatch({ type: "TICK" });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [
    timerSettings.enabled,
    timerSettings.duration,
    timeRemaining,
    roundKey,
    dispatch,
  ]);

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
  TICK: <TState extends { timeRemaining: number }>(state: TState): TState => ({
    ...state,
    timeRemaining: Math.max(0, state.timeRemaining - 1),
  }),
};
