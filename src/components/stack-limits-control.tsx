import { Button, RangeSlider, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DECK_SIZE, MIN_FLASHCARD_RANGE, RANGE_PRESETS } from "../constants";
import type { StackLimits } from "../types/stack-limits";
import { createDeckPosition } from "../types/stacks";

type StackLimitsControlProps = {
  limits: StackLimits;
  onLimitsChange: (limits: StackLimits) => void;
};

export const StackLimitsControl = ({
  limits,
  onLimitsChange,
}: StackLimitsControlProps) => {
  const { t } = useTranslation();

  const [sliderValue, setSliderValue] = useState<[number, number]>([
    limits.start,
    limits.end,
  ]);

  useEffect(() => {
    setSliderValue([limits.start, limits.end]);
  }, [limits.start, limits.end]);

  const sliderRangeSize = sliderValue[1] - sliderValue[0] + 1;
  const sliderIsFull = sliderValue[0] === 1 && sliderValue[1] === DECK_SIZE;

  const handleSliderChangeEnd = useCallback(
    (value: [number, number]) => {
      onLimitsChange({
        end: createDeckPosition(value[1]),
        start: createDeckPosition(value[0]),
      });
    },
    [onLimitsChange]
  );

  const handlePresetClick = useCallback(
    (preset: number) => {
      onLimitsChange({
        end: createDeckPosition(preset),
        start: createDeckPosition(1),
      });
    },
    [onLimitsChange]
  );

  const handlePresetButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const preset = Number(event.currentTarget.dataset.preset);
      handlePresetClick(preset);
    },
    [handlePresetClick]
  );

  const description = sliderIsFull
    ? t("stackLimits.fullDeck")
    : t("stackLimits.description", {
        count: sliderRangeSize,
        end: sliderValue[1],
        start: sliderValue[0],
      });

  return (
    <Stack data-testid="stack-limits-control" gap="xs">
      <Button.Group aria-label={t("stackLimits.presetsGroupAriaLabel")}>
        {RANGE_PRESETS.map((preset) => (
          <Button
            aria-label={t("stackLimits.presetAriaLabel", { count: preset })}
            aria-pressed={limits.start === 1 && limits.end === preset}
            data-preset={preset}
            key={preset}
            onClick={handlePresetButtonClick}
            size="compact-xs"
            variant={
              limits.start === 1 && limits.end === preset ? "filled" : "light"
            }
          >
            {preset}
          </Button>
        ))}
      </Button.Group>
      <RangeSlider
        aria-label={t("stackLimits.ariaLabel")}
        max={DECK_SIZE}
        min={1}
        minRange={MIN_FLASHCARD_RANGE}
        onChange={setSliderValue}
        onChangeEnd={handleSliderChangeEnd}
        step={1}
        thumbFromLabel={t("stackLimits.thumbStartLabel")}
        thumbToLabel={t("stackLimits.thumbEndLabel")}
        value={sliderValue}
      />
      <Text aria-live="polite" c="dimmed" size="xs">
        {description}
      </Text>
    </Stack>
  );
};
