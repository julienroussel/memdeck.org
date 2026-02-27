import { Button, Group, Table, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionRecord } from "../../types/session";
import { stacks } from "../../types/stacks";
import {
  formatDuration,
  toAccuracyPercent,
} from "../../utils/session-formatting";

export const PAGE_SIZE = 20;

type StatsHistoryProps = {
  history: SessionRecord[];
};

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const StatsHistory = ({ history }: StatsHistoryProps) => {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleHistory = history.slice(0, visibleCount);

  if (history.length === 0) {
    return (
      <Text c="dimmed" ta="center">
        {t("stats.noSessions")}
      </Text>
    );
  }

  const hasMore = visibleCount < history.length;

  return (
    <>
      <Title order={3}>{t("stats.sessionHistory")}</Title>
      <Table striped>
        <Table.Caption>{t("stats.sessionHistoryCaption")}</Table.Caption>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("stats.date")}</Table.Th>
            <Table.Th>{t("stats.mode")}</Table.Th>
            <Table.Th>{t("stats.stack")}</Table.Th>
            <Table.Th ta="center">{t("stats.score")}</Table.Th>
            <Table.Th ta="center">{t("common.accuracy")}</Table.Th>
            <Table.Th ta="center">{t("common.bestStreak")}</Table.Th>
            <Table.Th ta="center">{t("common.duration")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visibleHistory.map((record) => (
            <Table.Tr key={record.id}>
              <Table.Td>{formatDate(record.startedAt)}</Table.Td>
              <Table.Td>{record.mode}</Table.Td>
              <Table.Td>
                {stacks[record.stackKey]?.name ?? record.stackKey}
              </Table.Td>
              <Table.Td ta="center">
                {record.successes}/{record.questionsCompleted}
              </Table.Td>
              <Table.Td ta="center">
                {toAccuracyPercent(record.accuracy)}%
              </Table.Td>
              <Table.Td ta="center">{record.bestStreak}</Table.Td>
              <Table.Td ta="center">
                {formatDuration(record.durationSeconds)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {hasMore && (
        <Group justify="center" mt="sm">
          <Button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            size="compact-sm"
            variant="subtle"
          >
            {t("common.showMore")}
          </Button>
        </Group>
      )}
    </>
  );
};
