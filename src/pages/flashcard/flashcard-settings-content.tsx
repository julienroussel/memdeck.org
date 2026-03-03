import { Divider, Stack } from "@mantine/core";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { FlashcardModeSelector } from "./flashcard-mode-selector";

type FlashcardSettingsContentProps = {
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  onDirectionChange: (direction: NeighborDirection) => void;
  onModeChange: (mode: FlashcardMode) => void;
  onDurationChange: (duration: TimerDuration) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  timerSettings: TimerSettings;
};

export const FlashcardSettingsContent = ({
  mode,
  neighborDirection,
  onDirectionChange,
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
    <TimerSettingsControl
      onDurationChange={onDurationChange}
      onEnabledChange={onTimerEnabledChange}
      timerSettings={timerSettings}
    />
  </Stack>
);
