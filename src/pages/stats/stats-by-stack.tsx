import { Table, Text, Title } from "@mantine/core";
import { useAllTimeStats } from "../../hooks/use-all-time-stats";
import { isStackKey } from "../../hooks/use-selected-stack";
import { stacks } from "../../types/stacks";
import { calculateAccuracy, toAccuracyPercent } from "../../utils/session";

export const StatsByStack = () => {
  const { getStatsByStack } = useAllTimeStats();
  const stackKeys = Object.keys(stacks).filter(isStackKey);

  const rows = stackKeys
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
    .filter(Boolean);

  if (rows.length === 0) {
    return (
      <Text c="dimmed" ta="center">
        No stats yet. Complete a session to see per-stack data.
      </Text>
    );
  }

  return (
    <>
      <Title order={3}>By Stack</Title>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Stack</Table.Th>
            <Table.Th ta="center">Sessions</Table.Th>
            <Table.Th ta="center">Questions</Table.Th>
            <Table.Th ta="center">Accuracy</Table.Th>
            <Table.Th ta="center">Best Streak</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </>
  );
};
