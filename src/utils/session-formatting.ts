/** Formats a duration in seconds to a human-readable string (e.g. "2m 30s") */
export const formatDuration = (seconds: number): string => {
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
};

/** Calculates accuracy as a 0-1 decimal. Returns 0 when no attempts. */
export const calculateAccuracy = (successes: number, fails: number): number => {
  const total = successes + fails;
  if (total === 0) {
    return 0;
  }
  return successes / total;
};

/** Converts a 0-1 accuracy decimal to a rounded integer percentage */
export const toAccuracyPercent = (accuracy: number): number =>
  Math.round(accuracy * 100);
