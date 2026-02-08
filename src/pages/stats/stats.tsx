import { Space, Stack, Text, Title } from "@mantine/core";
import { useAllTimeStats } from "../../hooks/use-all-time-stats";
import { useSessionHistory } from "../../hooks/use-session-history";
import { AccuracyChart } from "./accuracy-chart";
import { StatsByStack } from "./stats-by-stack";
import { StatsHistory } from "./stats-history";
import { StatsOverview } from "./stats-overview";

export const Stats = () => {
  const { history } = useSessionHistory();
  const { getGlobalStats } = useAllTimeStats();
  const globalStats = getGlobalStats();

  const hasData = globalStats.totalSessions > 0;

  return (
    <Stack gap="xl" p="md">
      <Title order={1}>Stats</Title>

      {!hasData && (
        <Text c="dimmed" ta="center">
          No training data yet. Complete a flashcard or ACAAN session to see
          your stats here.
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
