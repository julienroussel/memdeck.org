import { useCallback, useMemo } from "react";
import { ALL_TIME_STATS_LSK } from "../constants";
import type {
  AllTimeStats,
  AllTimeStatsEntry,
  TrainingMode,
} from "../types/session";
import type { StackKey } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";
import {
  aggregateStatsEntries,
  createEmptyStatsEntry,
  isAllTimeStats,
  statsKey,
} from "../utils/session";

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
          const [keyMode] = key.split(":");
          return keyMode === mode;
        })
        .map(([, entry]) => entry);
      return aggregateStatsEntries(entries);
    },
    [stats]
  );

  const getStatsByStack = useCallback(
    (stackKey: StackKey): AllTimeStatsEntry => {
      const entries = Object.entries(stats)
        .filter(([key]) => {
          const parts = key.split(":");
          return parts[1] === stackKey;
        })
        .map(([, entry]) => entry);
      return aggregateStatsEntries(entries);
    },
    [stats]
  );

  const getGlobalStats = useCallback(
    (): AllTimeStatsEntry => aggregateStatsEntries(Object.values(stats)),
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
