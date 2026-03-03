import { SegmentedControl } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import {
  isNeighborDirection,
  isPositionSubMode,
  isPrimaryMode,
  NEIGHBOR_DIRECTION_OPTIONS,
  POSITION_SUB_MODE_OPTIONS,
  PRIMARY_MODE_OPTIONS,
  toFlashcardMode,
  toPositionSubMode,
  toPrimaryMode,
} from "../../types/flashcard";

export const FlashcardModeSelector = ({
  mode,
  neighborDirection,
  onModeChange,
  onDirectionChange,
}: {
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  onModeChange: (mode: FlashcardMode) => void;
  onDirectionChange: (direction: NeighborDirection) => void;
}) => {
  const { t } = useTranslation();
  const primaryMode = toPrimaryMode(mode);
  const positionSubMode = toPositionSubMode(mode);

  const primaryData = useMemo(
    () =>
      PRIMARY_MODE_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelKey),
      })),
    [t]
  );

  const positionSubModeData = useMemo(
    () =>
      POSITION_SUB_MODE_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelKey),
      })),
    [t]
  );

  const neighborDirectionData = useMemo(
    () =>
      NEIGHBOR_DIRECTION_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelKey),
      })),
    [t]
  );

  const handlePrimaryChange = (value: string) => {
    if (!isPrimaryMode(value)) {
      return;
    }
    onModeChange(toFlashcardMode(value, positionSubMode));
  };

  const handleSubModeChange = (value: string) => {
    if (!isPositionSubMode(value)) {
      return;
    }
    onModeChange(toFlashcardMode("position", value));
  };

  const handleDirectionChange = (value: string) => {
    if (!isNeighborDirection(value)) {
      return;
    }
    onDirectionChange(value);
  };

  return (
    <>
      <SegmentedControl
        aria-label={t("flashcard.primaryModeAriaLabel")}
        data={primaryData}
        fullWidth
        onChange={handlePrimaryChange}
        size="xs"
        value={primaryMode}
      />
      {primaryMode === "position" ? (
        <SegmentedControl
          aria-label={t("flashcard.positionSubModeAriaLabel")}
          data={positionSubModeData}
          fullWidth
          key="position-submode"
          onChange={handleSubModeChange}
          size="xs"
          value={positionSubMode}
        />
      ) : (
        <SegmentedControl
          aria-label={t("flashcard.neighborDirectionAriaLabel")}
          data={neighborDirectionData}
          fullWidth
          key="neighbor-direction"
          onChange={handleDirectionChange}
          size="xs"
          value={neighborDirection}
        />
      )}
    </>
  );
};
