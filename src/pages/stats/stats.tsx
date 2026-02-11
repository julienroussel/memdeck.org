import { Space, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useAllTimeStats } from "../../hooks/use-all-time-stats";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useSessionHistory } from "../../hooks/use-session-history";
import { AccuracyChart } from "./accuracy-chart";
import { StatsByStack } from "./stats-by-stack";
import { StatsHistory } from "./stats-history";
import { StatsOverview } from "./stats-overview";

export const Stats = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("stats.pageTitle"),
    description: t("stats.pageDescription"),
  });
  const { history } = useSessionHistory();
  const { getGlobalStats } = useAllTimeStats();
  const globalStats = getGlobalStats();

  const hasData = globalStats.totalSessions > 0;

  return (
    <Stack gap="xl" p="md">
      <Title order={1}>{t("stats.title")}</Title>

      {!hasData && (
        <Text c="dimmed" ta="center">
          {t("stats.noData")}
        </Text>
      )}

      {hasData && (
        <>
          <StatsOverview stats={globalStats} />
          <Space h="sm" />
          <AccuracyChart history={history} />
          <Space h="sm" />
          <StatsByStack />
          <Space h="sm" />
          <StatsHistory history={history} />
        </>
      )}
    </Stack>
  );
};
