import { SimpleGrid } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { StatDisplay } from "../../components/stat-display";
import type { AllTimeStatsEntry } from "../../types/session";
import { calculateAccuracy, toAccuracyPercent } from "../../utils/session";

type StatsOverviewProps = {
  stats: AllTimeStatsEntry;
};

export const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const { t } = useTranslation();
  const accuracy = calculateAccuracy(stats.totalSuccesses, stats.totalFails);
  const accuracyPercent = toAccuracyPercent(accuracy);

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }}>
      <StatDisplay
        label={t("stats.totalSessions")}
        value={String(stats.totalSessions)}
        withBorder
      />
      <StatDisplay
        label={t("stats.totalQuestions")}
        value={String(stats.totalQuestions)}
        withBorder
      />
      <StatDisplay
        label={t("stats.overallAccuracy")}
        value={`${accuracyPercent}%`}
        withBorder
      />
      <StatDisplay
        label={t("common.bestStreak")}
        value={String(stats.globalBestStreak)}
        withBorder
      />
    </SimpleGrid>
  );
};
