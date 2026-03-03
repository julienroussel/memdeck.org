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

type FlashcardSubFilter = "all" | "position" | "neighbor";

export const isFilter = (value: string): value is Filter =>
  value === "all" || includes(TRAINING_MODES, value);

export const isFlashcardSubFilter = (
  value: string
): value is FlashcardSubFilter =>
  value === "all" || value === "position" || value === "neighbor";

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

const getSubModeI18nKey = (
  record: SessionRecord
): "stats.subModeNeighbor" | "stats.subModePosition" | null => {
  if (record.mode !== "flashcard" || record.flashcardMode === undefined) {
    return null;
  }
  return record.flashcardMode === "neighbor"
    ? "stats.subModeNeighbor"
    : "stats.subModePosition";
};

export const AccuracyChart = ({ history }: AccuracyChartProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const [flashcardSubFilter, setFlashcardSubFilter] =
    useState<FlashcardSubFilter>("all");

  const filterOptions = useMemo<Array<{ label: string; value: Filter }>>(
    () => [
      { label: t("stats.filterAll"), value: "all" },
      { label: t("stats.filterFlashcard"), value: "flashcard" },
      { label: t("stats.filterAcaan"), value: "acaan" },
    ],
    [t]
  );

  const subFilterOptions = useMemo<
    Array<{ label: string; value: FlashcardSubFilter }>
  >(
    () => [
      { label: t("stats.filterAll"), value: "all" },
      { label: t("stats.filterPosition"), value: "position" },
      { label: t("stats.filterNeighbor"), value: "neighbor" },
    ],
    [t]
  );

  const handleFilterChange = (value: string) => {
    if (isFilter(value)) {
      setFilter(value);
      if (value !== "flashcard") {
        setFlashcardSubFilter("all");
      }
    }
  };

  const handleSubFilterChange = (value: string) => {
    if (isFlashcardSubFilter(value)) {
      setFlashcardSubFilter(value);
    }
  };

  const filteredHistory = useMemo(() => {
    let result =
      filter === "all" ? history : history.filter((r) => r.mode === filter);

    if (filter === "flashcard" && flashcardSubFilter !== "all") {
      result = result.filter((r) => {
        if (r.mode !== "flashcard") {
          return false;
        }
        if (flashcardSubFilter === "neighbor") {
          return r.flashcardMode === "neighbor";
        }
        // "position" includes legacy records (no flashcardMode) and all non-neighbor modes
        return r.flashcardMode !== "neighbor";
      });
    }

    return result;
  }, [filter, flashcardSubFilter, history]);

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
          data={subFilterOptions}
          onChange={handleSubFilterChange}
          size="xs"
          value={flashcardSubFilter}
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
