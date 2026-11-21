/** Valid timer duration values in seconds: the single source for the type and its run-time check. */
export const VALID_DURATIONS = [5, 10, 15, 30] as const;

export type TimerDuration = (typeof VALID_DURATIONS)[number];

export type TimerSettings = {
  enabled: boolean;
  duration: TimerDuration;
};
