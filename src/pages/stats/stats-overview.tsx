import { SimpleGrid } from "@mantine/core";
import { StatDisplay } from "../../components/stat-display";
import type { AllTimeStatsEntry } from "../../types/session";
import { calculateAccuracy, toAccuracyPercent } from "../../utils/session";

type StatsOverviewProps = {
  stats: AllTimeStatsEntry;
};

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const accuracy = calculateAccuracy(stats.totalSuccesses, stats.totalFails);
  const accuracyPercent = toAccuracyPercent(accuracy);

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      <StatDisplay
        label="Total Sessions"
        value={String(stats.totalSessions)}
        withBorder
      />
      <StatDisplay
        label="Total Questions"
        value={String(stats.totalQuestions)}
        withBorder
      />
      <StatDisplay
        label="Overall Accuracy"
        value={`${accuracyPercent}%`}
        withBorder
      />
      <StatDisplay
        label="Best Streak"
        value={String(stats.globalBestStreak)}
        withBorder
      />
    </SimpleGrid>
  );
};
