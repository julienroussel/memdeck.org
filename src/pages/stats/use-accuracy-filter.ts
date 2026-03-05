import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type SessionRecord,
  TRAINING_MODES,
  type TrainingMode,
} from "../../types/session";
import { isSpotCheckMode, type SpotCheckMode } from "../../types/spot-check";
import { includes } from "../../utils/includes";

type Filter = "all" | TrainingMode;

type FlashcardSubFilter = "all" | "position" | "neighbor";

type SpotCheckSubFilter = "all" | SpotCheckMode;

export const isFilter = (value: string): value is Filter =>
  value === "all" || includes(TRAINING_MODES, value);

export const isFlashcardSubFilter = (
  value: string
): value is FlashcardSubFilter =>
  value === "all" || value === "position" || value === "neighbor";

const isSpotCheckSubFilter = (value: string): value is SpotCheckSubFilter =>
  value === "all" || isSpotCheckMode(value);

type UseAccuracyFilterResult = {
  filter: Filter;
  flashcardSubFilter: FlashcardSubFilter;
  spotCheckSubFilter: SpotCheckSubFilter;
  filterOptions: Array<{ label: string; value: Filter }>;
  flashcardSubFilterOptions: Array<{
    label: string;
    value: FlashcardSubFilter;
  }>;
  spotCheckSubFilterOptions: Array<{
    label: string;
    value: SpotCheckSubFilter;
  }>;
  handleFilterChange: (value: string) => void;
  handleFlashcardSubFilterChange: (value: string) => void;
  handleSpotCheckSubFilterChange: (value: string) => void;
  filteredHistory: SessionRecord[];
};

export const useAccuracyFilter = (
  history: SessionRecord[]
): UseAccuracyFilterResult => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const [flashcardSubFilter, setFlashcardSubFilter] =
    useState<FlashcardSubFilter>("all");
  const [spotCheckSubFilter, setSpotCheckSubFilter] =
    useState<SpotCheckSubFilter>("all");

  const filterOptions = useMemo<Array<{ label: string; value: Filter }>>(
    () => [
      { label: t("stats.filterAll"), value: "all" },
      { label: t("stats.filterFlashcard"), value: "flashcard" },
      { label: t("stats.filterSpotCheck"), value: "spotcheck" },
      { label: t("stats.filterAcaan"), value: "acaan" },
    ],
    [t]
  );

  const flashcardSubFilterOptions = useMemo<
    Array<{ label: string; value: FlashcardSubFilter }>
  >(
    () => [
      { label: t("stats.filterAll"), value: "all" },
      { label: t("stats.filterPosition"), value: "position" },
      { label: t("stats.filterNeighbor"), value: "neighbor" },
    ],
    [t]
  );

  const spotCheckSubFilterOptions = useMemo<
    Array<{ label: string; value: SpotCheckSubFilter }>
  >(
    () => [
      { label: t("stats.filterAll"), value: "all" },
      { label: t("stats.filterMissing"), value: "missing" },
      { label: t("stats.filterSwapped"), value: "swapped" },
      { label: t("stats.filterMoved"), value: "moved" },
    ],
    [t]
  );

  const handleFilterChange = (value: string) => {
    if (isFilter(value)) {
      setFilter(value);
      if (value !== "flashcard") {
        setFlashcardSubFilter("all");
      }
      if (value !== "spotcheck") {
        setSpotCheckSubFilter("all");
      }
    }
  };

  const handleFlashcardSubFilterChange = (value: string) => {
    if (isFlashcardSubFilter(value)) {
      setFlashcardSubFilter(value);
    }
  };

  const handleSpotCheckSubFilterChange = (value: string) => {
    if (isSpotCheckSubFilter(value)) {
      setSpotCheckSubFilter(value);
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

    if (filter === "spotcheck" && spotCheckSubFilter !== "all") {
      result = result.filter((r) => {
        if (r.mode !== "spotcheck") {
          return false;
        }
        return r.spotCheckMode === spotCheckSubFilter;
      });
    }

    return result;
  }, [filter, flashcardSubFilter, spotCheckSubFilter, history]);

  return {
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
  };
};
