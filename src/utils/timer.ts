import type { TimerDuration } from "../types/timer";
import { VALID_DURATIONS } from "../types/timer";
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
 * Returns a color string based on time remaining for timer display, first match wins:
 * Blue: the full duration remains, so a short timer does not start in warning
 * Red: <= 3 seconds (critical)
 * Yellow: <= 5 seconds (warning)
 * Blue: otherwise (normal)
 */
export const getTimerColor = (
  timeRemaining: number,
  timerDuration: number
): string => {
  if (timerDuration > 0 && timeRemaining >= timerDuration) {
    return "blue";
  }
  if (timeRemaining <= 3) {
    return "red";
  }
  if (timeRemaining <= 5) {
    return "yellow";
  }
  return "blue";
};

/** Timer duration options formatted for SegmentedControl */
export const TIMER_DURATION_OPTIONS: { label: string; value: string }[] =
  VALID_DURATIONS.map((d) => ({ label: `${d}s`, value: String(d) }));

/** Type guard to check if a number is a valid timer duration */
export const isValidDuration = (value: number): value is TimerDuration =>
  includes(VALID_DURATIONS, value);
