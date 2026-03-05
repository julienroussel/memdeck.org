import {
  Group,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { SessionRecord } from "../../types/session";
import { stacks } from "../../types/stacks";
import { toAccuracyPercent } from "../../utils/session-formatting";
import { MODE_LABELS } from "./stats-i18n";
import { useAccuracyFilter } from "./use-accuracy-filter";

const CHART_SIZE = 20;

type AccuracyChartProps = {
  history: SessionRecord[];
};

export const getAccuracyColor = (percent: number): string => {
  if (percent >= 80) {
    return "green";
  }
  if (percent >= 50) {
    return "yellow";
  }
  return "red";
};

const getSubModeI18nKey = (
  record: SessionRecord
):
  | "stats.subModeNeighbor"
  | "stats.subModePosition"
  | "stats.subModeMissing"
  | "stats.subModeSwapped"
  | "stats.subModeMoved"
  | null => {
  if (record.mode === "flashcard" && record.flashcardMode !== undefined) {
    return record.flashcardMode === "neighbor"
      ? "stats.subModeNeighbor"
      : "stats.subModePosition";
  }
  if (record.mode === "spotcheck" && record.spotCheckMode !== undefined) {
    switch (record.spotCheckMode) {
      case "missing":
        return "stats.subModeMissing";
      case "swapped":
        return "stats.subModeSwapped";
      case "moved":
        return "stats.subModeMoved";
      default: {
        const _exhaustive: never = record.spotCheckMode;
        return _exhaustive;
      }
    }
  }
  return null;
};

export const AccuracyChart = ({ history }: AccuracyChartProps) => {
  const { t } = useTranslation();

  const {
    filter,
    flashcardSubFilter,
    spotCheckSubFilter,
    filterOptions,
    flashcardSubFilterOptions,
    spotCheckSubFilterOptions,
    handleFilterChange,
    handleFlashcardSubFilterChange,
    handleSpotCheckSubFilterChange,
    filteredHistory,
  } = useAccuracyFilter(history);

  const chartData = filteredHistory.slice(0, CHART_SIZE).reverse();

  if (history.length === 0) {
    return null;
  }

  return (
    <>
      <Title order={3}>{t("stats.accuracyTrend")}</Title>
      <SegmentedControl
        aria-label={t("stats.filterByModeAriaLabel")}
        data={filterOptions}
        onChange={handleFilterChange}
        size="xs"
        value={filter}
      />
      {filter === "flashcard" && (
        <SegmentedControl
          aria-label={t("stats.filterBySubModeAriaLabel")}
          data={flashcardSubFilterOptions}
          onChange={handleFlashcardSubFilterChange}
          size="xs"
          value={flashcardSubFilter}
        />
      )}
      {filter === "spotcheck" && (
        <SegmentedControl
          aria-label={t("stats.filterBySpotCheckSubModeAriaLabel")}
          data={spotCheckSubFilterOptions}
          onChange={handleSpotCheckSubFilterChange}
          size="xs"
          value={spotCheckSubFilter}
        />
      )}
      {chartData.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center">
          {t("stats.noFilterMatch")}
        </Text>
      ) : (
        <Stack gap="xs">
          {chartData.map((record) => {
            const percent = toAccuracyPercent(record.accuracy);
            const color = getAccuracyColor(percent);
            const subModeKey = getSubModeI18nKey(record);
            const tooltipLabel =
              subModeKey !== null
                ? t("stats.chartTooltipWithSubMode", {
                    mode: t(MODE_LABELS[record.mode]),
                    subMode: t(subModeKey),
                    stack: stacks[record.stackKey]?.name ?? record.stackKey,
                    successes: record.successes,
                    total: record.questionsCompleted,
                  })
                : t("stats.chartTooltip", {
                    mode: t(MODE_LABELS[record.mode]),
                    stack: stacks[record.stackKey]?.name ?? record.stackKey,
                    successes: record.successes,
                    total: record.questionsCompleted,
                  });
            return (
              <Group gap="xs" key={record.id} wrap="nowrap">
                <Text c="dimmed" miw={40} size="xs" ta="right">
                  {percent}%
                </Text>
                <Tooltip label={tooltipLabel}>
                  <Progress
                    aria-label={tooltipLabel}
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
