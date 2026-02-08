import {
  Group,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useState } from "react";
import {
  type SessionRecord,
  TRAINING_MODES,
  type TrainingMode,
} from "../../types/session";
import { stacks } from "../../types/stacks";
import { toAccuracyPercent } from "../../utils/session";

const CHART_SIZE = 20;

type AccuracyChartProps = {
  history: SessionRecord[];
};

type Filter = "all" | TrainingMode;

const filterOptions: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "all" },
  { label: "Flashcard", value: "flashcard" },
  { label: "ACAAN", value: "acaan" },
];

export const isFilter = (value: string): value is Filter =>
  value === "all" || (TRAINING_MODES as readonly string[]).includes(value);

export const getAccuracyColor = (percent: number): string => {
  if (percent >= 80) {
    return "green";
  }
  if (percent >= 50) {
    return "yellow";
  }
  return "red";
};

export const AccuracyChart = ({ history }: AccuracyChartProps) => {
  const [filter, setFilter] = useState<Filter>("all");

  const handleFilterChange = (value: string) => {
    if (isFilter(value)) {
      setFilter(value);
    }
  };

  const filteredHistory =
    filter === "all" ? history : history.filter((r) => r.mode === filter);

  const chartData = filteredHistory.slice(0, CHART_SIZE).reverse();

  if (history.length === 0) {
    return null;
  }

  return (
    <>
      <Title order={3}>Accuracy Trend</Title>
      <SegmentedControl
        data={filterOptions}
        onChange={handleFilterChange}
        size="xs"
        value={filter}
      />
      {chartData.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center">
          No sessions match this filter.
        </Text>
      ) : (
        <Stack gap="xs">
          {chartData.map((record) => {
            const percent = toAccuracyPercent(record.accuracy);
            const color = getAccuracyColor(percent);
            return (
              <Group gap="xs" key={record.id} wrap="nowrap">
                <Text c="dimmed" miw={40} size="xs" ta="right">
                  {percent}%
                </Text>
                <Tooltip
                  label={`${record.mode} · ${stacks[record.stackKey]?.name ?? record.stackKey} · ${record.successes}/${record.questionsCompleted}`}
                >
                  <Progress
                    color={color}
                    radius="sm"
                    size="md"
                    style={{ flex: 1 }}
                    value={percent}
                  />
                </Tooltip>
              </Group>
            );
          })}
        </Stack>
      )}
    </>
  );
};
