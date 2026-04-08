import { Space, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { JsonLd } from "../../components/json-ld";
import { SITE_URL } from "../../constants";
import { useAllTimeStats } from "../../hooks/use-all-time-stats";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useSessionHistory } from "../../hooks/use-session-history";
import { AccuracyChart } from "./accuracy-chart";
import { StatsByStack } from "./stats-by-stack";
import { StatsHistory } from "./stats-history";
import { StatsOverview } from "./stats-overview";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Stats",
    },
  ],
};

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
      <JsonLd data={breadcrumbSchema} />
      <Title order={1}>{t("stats.title")}</Title>
      <Text c="dimmed" size="sm">
        {t("stats.seoIntro")}
      </Text>

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
