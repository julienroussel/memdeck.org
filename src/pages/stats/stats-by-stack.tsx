import { Table, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAllTimeStats } from "../../hooks/use-all-time-stats";
import { isStackKey } from "../../hooks/use-selected-stack";
import { stacks } from "../../types/stacks";
import {
  calculateAccuracy,
  toAccuracyPercent,
} from "../../utils/session-formatting";

const stackKeys = Object.keys(stacks).filter(isStackKey);

export const StatsByStack = () => {
  const { t } = useTranslation();
  const { getStatsByStack } = useAllTimeStats();

  const rows = useMemo(
    () =>
      stackKeys
        .map((key) => {
          const entry = getStatsByStack(key);

          if (entry.totalSessions === 0) {
            return null;
          }

          const accuracy = calculateAccuracy(
            entry.totalSuccesses,
            entry.totalFails
          );

          return (
            <Table.Tr key={key}>
              <Table.Td>{stacks[key].name}</Table.Td>
              <Table.Td ta="center">{entry.totalSessions}</Table.Td>
              <Table.Td ta="center">{entry.totalQuestions}</Table.Td>
              <Table.Td ta="center">{toAccuracyPercent(accuracy)}%</Table.Td>
              <Table.Td ta="center">{entry.globalBestStreak}</Table.Td>
            </Table.Tr>
          );
        })
        .filter(Boolean),
    [getStatsByStack]
  );

  if (rows.length === 0) {
    return (
      <Text c="dimmed" ta="center">
        {t("stats.noStackStats")}
      </Text>
    );
  }

  return (
    <>
      <Title order={3}>{t("stats.byStack")}</Title>
      <Table striped>
        <Table.Caption>{t("stats.statisticsByStack")}</Table.Caption>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("stats.stack")}</Table.Th>
            <Table.Th ta="center">{t("stats.sessions")}</Table.Th>
            <Table.Th ta="center">{t("common.questions")}</Table.Th>
            <Table.Th ta="center">{t("common.accuracy")}</Table.Th>
            <Table.Th ta="center">{t("common.bestStreak")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </>
  );
};
