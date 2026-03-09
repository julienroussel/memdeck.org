import { Button, RangeSlider, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DECK_SIZE, MIN_FLASHCARD_RANGE, RANGE_PRESETS } from "../constants";
import { eventBus } from "../services/event-bus";
import type { StackLimits } from "../types/stack-limits";
import { createDeckPosition } from "../types/stacks";

type StackLimitsControlProps = {
  limits: StackLimits;
  onLimitsChange: (limits: StackLimits) => void;
  stackName: string;
};

export const StackLimitsControl = ({
  limits,
  onLimitsChange,
  stackName,
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
      const newLimits: StackLimits = {
        start: createDeckPosition(value[0]),
        end: createDeckPosition(value[1]),
      };
      onLimitsChange(newLimits);
      eventBus.emit.STACK_LIMITS_CHANGED({
        start: value[0],
        end: value[1],
        rangeSize: value[1] - value[0] + 1,
        stackName,
      });
    },
    [onLimitsChange, stackName]
  );

  const handlePresetClick = useCallback(
    (preset: number) => {
      const newLimits: StackLimits = {
        start: createDeckPosition(1),
        end: createDeckPosition(preset),
      };
      onLimitsChange(newLimits);
      eventBus.emit.STACK_LIMITS_CHANGED({
        start: 1,
        end: preset,
        rangeSize: preset,
        stackName,
      });
    },
    [onLimitsChange, stackName]
  );

  const description = sliderIsFull
    ? t("stackLimits.fullDeck")
    : t("stackLimits.description", {
        start: sliderValue[0],
        end: sliderValue[1],
        count: sliderRangeSize,
      });

  return (
    <Stack data-testid="stack-limits-control" gap="xs">
      <Button.Group aria-label={t("stackLimits.presetsGroupAriaLabel")}>
        {RANGE_PRESETS.map((preset) => (
          <Button
            aria-label={t("stackLimits.presetAriaLabel", { count: preset })}
            aria-pressed={limits.start === 1 && limits.end === preset}
            key={preset}
            onClick={() => handlePresetClick(preset)}
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
