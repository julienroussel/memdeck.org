/** Valid timer duration values in seconds */
export type TimerDuration = 10 | 15 | 30;

export type TimerSettings = {
  enabled: boolean;
  duration: TimerDuration;
};
