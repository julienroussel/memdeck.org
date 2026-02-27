import {
  Group,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type en from "../../i18n/locales/en.json";
import {
  type SessionRecord,
  TRAINING_MODES,
  type TrainingMode,
} from "../../types/session";
import { stacks } from "../../types/stacks";
import { includes } from "../../utils/includes";
import { toAccuracyPercent } from "../../utils/session-formatting";

/** Valid i18n keys for stats translations, derived from en.json */
type StatsI18nKey = `stats.${keyof (typeof en)["stats"] & string}`;

const CHART_SIZE = 20;

type AccuracyChartProps = {
  history: SessionRecord[];
};

type Filter = "all" | TrainingMode;

export const isFilter = (value: string): value is Filter =>
  value === "all" || includes(TRAINING_MODES, value);

export const getAccuracyColor = (percent: number): string => {
  if (percent >= 80) {
    return "green";
  }
  if (percent >= 50) {
    return "yellow";
  }
  return "red";
};

const MODE_LABELS = {
  flashcard: "stats.modeFlashcard",
  acaan: "stats.modeAcaan",
} as const satisfies Record<TrainingMode, StatsI18nKey>;

export const AccuracyChart = ({ history }: AccuracyChartProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");

  const filterOptions = useMemo<Array<{ label: string; value: Filter }>>(
    () => [
      { label: t("stats.filterAll"), value: "all" },
      { label: t("stats.filterFlashcard"), value: "flashcard" },
      { label: t("stats.filterAcaan"), value: "acaan" },
    ],
    [t]
  );

  const handleFilterChange = (value: string) => {
    if (isFilter(value)) {
      setFilter(value);
    }
  };

  const filteredHistory = useMemo(
    () =>
      filter === "all" ? history : history.filter((r) => r.mode === filter),
    [filter, history]
  );

  const chartData = filteredHistory.slice(0, CHART_SIZE).reverse();

  if (history.length === 0) {
    return null;
  }

  return (
    <>
      <Title order={3}>{t("stats.accuracyTrend")}</Title>
      <SegmentedControl
        data={filterOptions}
        onChange={handleFilterChange}
        size="xs"
        value={filter}
      />
      {chartData.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center">
          {t("stats.noFilterMatch")}
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
                  label={t("stats.chartTooltip", {
                    mode: t(MODE_LABELS[record.mode]),
                    stack: stacks[record.stackKey]?.name ?? record.stackKey,
                    successes: record.successes,
                    total: record.questionsCompleted,
                  })}
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
