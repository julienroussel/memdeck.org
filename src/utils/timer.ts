import type { TimerDuration } from "../types/timer";
import { includes } from "./includes";

/**
 * Calculates timer progress as a percentage.
 * Returns 0 if timerDuration is 0 to prevent division by zero.
 */
export const calculateTimerProgress = (
  timeRemaining: number,
  timerDuration: number
): number => (timerDuration > 0 ? (timeRemaining / timerDuration) * 100 : 0);

/**
 * Returns a color string based on time remaining for timer display.
 * Red: <= 3 seconds (critical)
 * Yellow: <= 5 seconds (warning)
 * Blue: > 5 seconds (normal)
 */
export const getTimerColor = (timeRemaining: number): string => {
  if (timeRemaining <= 3) {
    return "red";
  }
  if (timeRemaining <= 5) {
    return "yellow";
  }
  return "blue";
};

/** Valid timer duration options */
export const VALID_DURATIONS: readonly TimerDuration[] = [10, 15, 30];

/** Timer duration options formatted for SegmentedControl */
export const TIMER_DURATION_OPTIONS: { label: string; value: string }[] =
  VALID_DURATIONS.map((d) => ({ label: `${d}s`, value: String(d) }));

/** Type guard to check if a number is a valid timer duration */
export const isValidDuration = (value: number): value is TimerDuration =>
  includes(VALID_DURATIONS, value);
