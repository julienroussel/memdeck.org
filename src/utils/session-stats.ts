import type {
  AllTimeStatsEntry,
  StatsKey,
  TrainingMode,
} from "../types/session";
import type { StackKey } from "../types/stacks";

/** Builds a composite key for AllTimeStats lookups */
export const statsKey = (mode: TrainingMode, stackKey: StackKey): StatsKey =>
  `${mode}:${stackKey}`;

/**
 * Parses a validated StatsKey into its constituent mode and stackKey components.
 *
 * Assumes the input has already been validated via `isStatsKey()` (or constructed
 * via `statsKey()`). The internal `as` casts on the sliced substrings are safe
 * because the branded StatsKey type guarantees the format `"{TrainingMode}:{StackKey}"`.
 */
export const parseStatsKey = (
  key: StatsKey
): { mode: TrainingMode; stackKey: StackKey } => {
  const separatorIndex = key.indexOf(":");
  return {
    mode: key.slice(0, separatorIndex) as TrainingMode,
    stackKey: key.slice(separatorIndex + 1) as StackKey,
  };
};

/** Creates a zeroed-out AllTimeStatsEntry */
export const createEmptyStatsEntry = (): AllTimeStatsEntry => ({
  totalSessions: 0,
  totalQuestions: 0,
  totalSuccesses: 0,
  totalFails: 0,
  globalBestStreak: 0,
});

/** Sums multiple AllTimeStatsEntry objects into a single aggregate */
export const aggregateStatsEntries = (
  entries: AllTimeStatsEntry[]
): AllTimeStatsEntry => {
  const result = createEmptyStatsEntry();
  for (const entry of entries) {
    result.totalSessions += entry.totalSessions;
    result.totalQuestions += entry.totalQuestions;
    result.totalSuccesses += entry.totalSuccesses;
    result.totalFails += entry.totalFails;
    result.globalBestStreak = Math.max(
      result.globalBestStreak,
      entry.globalBestStreak
    );
  }
  return result;
};
