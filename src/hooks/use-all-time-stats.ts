import { useCallback, useMemo } from "react";
import { ALL_TIME_STATS_LSK } from "../constants";
import type {
  AllTimeStats,
  AllTimeStatsEntry,
  StatsKey,
  TrainingMode,
} from "../types/session";
import type { StackKey } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";
import {
  aggregateStatsEntries,
  createEmptyStatsEntry,
  isAllTimeStats,
  parseStatsKey,
  statsKey,
} from "../utils/session";

const isDefined = (
  entry: AllTimeStatsEntry | undefined
): entry is AllTimeStatsEntry => entry !== undefined;

export const useAllTimeStats = () => {
  const [rawStats] = useLocalDb<AllTimeStats>(ALL_TIME_STATS_LSK, {});

  const stats = useMemo(
    () => (isAllTimeStats(rawStats) ? rawStats : {}),
    [rawStats]
  );

  const getStats = useCallback(
    (mode: TrainingMode, stackKey: StackKey): AllTimeStatsEntry =>
      stats[statsKey(mode, stackKey)] ?? createEmptyStatsEntry(),
    [stats]
  );

  const getStatsByMode = useCallback(
    (mode: TrainingMode): AllTimeStatsEntry => {
      const entries = Object.entries(stats)
        .filter(([key]) => {
          const parsed = parseStatsKey(key as StatsKey);
          return parsed.mode === mode;
        })
        .map(([, entry]) => entry)
        .filter(isDefined);
      return aggregateStatsEntries(entries);
    },
    [stats]
  );

  const getStatsByStack = useCallback(
    (stackKey: StackKey): AllTimeStatsEntry => {
      const entries = Object.entries(stats)
        .filter(([key]) => {
          const parsed = parseStatsKey(key as StatsKey);
          return parsed.stackKey === stackKey;
        })
        .map(([, entry]) => entry)
        .filter(isDefined);
      return aggregateStatsEntries(entries);
    },
    [stats]
  );

  const getGlobalStats = useCallback(
    (): AllTimeStatsEntry =>
      aggregateStatsEntries(Object.values(stats).filter(isDefined)),
    [stats]
  );

  return {
    stats,
    getStats,
    getStatsByMode,
    getStatsByStack,
    getGlobalStats,
  };
};
