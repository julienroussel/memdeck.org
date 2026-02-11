import { Button, Group, Table, Text, Title } from "@mantine/core";
import { useState } from "react";
import type { SessionRecord } from "../../types/session";
import { stacks } from "../../types/stacks";
import { formatDuration, toAccuracyPercent } from "../../utils/session";

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleHistory = history.slice(0, visibleCount);

  if (history.length === 0) {
    return (
      <Text c="dimmed" ta="center">
        No sessions recorded yet.
      </Text>
    );
  }

  const hasMore = visibleCount < history.length;

  return (
    <>
      <Title order={3}>Session History</Title>
      <Table striped>
        <Table.Caption>Session history</Table.Caption>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Mode</Table.Th>
            <Table.Th>Stack</Table.Th>
            <Table.Th ta="center">Score</Table.Th>
            <Table.Th ta="center">Accuracy</Table.Th>
            <Table.Th ta="center">Best Streak</Table.Th>
            <Table.Th ta="center">Duration</Table.Th>
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
            Show more
          </Button>
        </Group>
      )}
    </>
  );
};
