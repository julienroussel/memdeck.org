type DurationTranslate = (
  key: "common.durationSeconds" | "common.durationMinutesSeconds",
  options: { minutes?: number; seconds: number }
) => string;

/**
 * Formats a duration in seconds through the locale catalog
 * (e.g. "2m 30s" in English, "2 min 30 s" in French).
 */
export const formatDuration = (
  seconds: number,
  t: DurationTranslate
): string => {
  const totalSeconds = Math.round(seconds);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) {
    return t("common.durationSeconds", { seconds: secs });
  }
  return t("common.durationMinutesSeconds", { minutes: mins, seconds: secs });
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
