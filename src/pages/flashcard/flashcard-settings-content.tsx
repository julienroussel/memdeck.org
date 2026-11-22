import { Divider, Stack } from "@mantine/core";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import type { DeckPosition } from "../../types/stacks";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { FlashcardModeSelector } from "./flashcard-mode-selector";
import { FocusPositionsControl } from "./focus-positions-control";

type FlashcardSettingsContentProps = {
  focusPositions: readonly DeckPosition[];
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  onDirectionChange: (direction: NeighborDirection) => void;
  onFocusPositionsChange: (positions: readonly DeckPosition[]) => void;
  onModeChange: (mode: FlashcardMode) => void;
  onDurationChange: (duration: TimerDuration) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  timerSettings: TimerSettings;
};

export const FlashcardSettingsContent = ({
  focusPositions,
  mode,
  neighborDirection,
  onDirectionChange,
  onFocusPositionsChange,
  onModeChange,
  onDurationChange,
  onTimerEnabledChange,
  timerSettings,
}: FlashcardSettingsContentProps) => (
  <Stack gap="md" p="xs">
    <FlashcardModeSelector
      mode={mode}
      neighborDirection={neighborDirection}
      onDirectionChange={onDirectionChange}
      onModeChange={onModeChange}
    />
    <Divider />
    <FocusPositionsControl
      onChange={onFocusPositionsChange}
      positions={focusPositions}
    />
    <Divider />
    <TimerSettingsControl
      onDurationChange={onDurationChange}
      onEnabledChange={onTimerEnabledChange}
      timerSettings={timerSettings}
    />
  </Stack>
);
