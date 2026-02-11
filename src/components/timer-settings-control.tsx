import { Group, SegmentedControl, Stack, Switch, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TimerDuration, TimerSettings } from "../types/timer";
import { isValidDuration, TIMER_DURATION_OPTIONS } from "../utils/timer";

type TimerSettingsControlProps = {
  timerSettings: TimerSettings;
  onEnabledChange: (enabled: boolean) => void;
  onDurationChange: (duration: TimerDuration) => void;
};

/**
 * Reusable control for timer settings (enable/disable + duration).
 * Used in options modals for both Flashcard and ACAAN trainers.
 */
export const TimerSettingsControl = ({
  timerSettings,
  onEnabledChange,
  onDurationChange,
}: TimerSettingsControlProps) => {
  const { t } = useTranslation();

  const handleTimerToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onEnabledChange(event.currentTarget.checked);
  };

  const handleDurationChange = (value: string) => {
    const numValue = Number(value);
    if (isValidDuration(numValue)) {
      onDurationChange(numValue);
    }
  };

  return (
    <Stack gap="md">
      <Switch
        checked={timerSettings.enabled}
        label={t("timer.timedMode")}
        onChange={handleTimerToggle}
      />
      {timerSettings.enabled && (
        <Group gap="xs">
          <Text size="sm">{t("timer.timeLimit")}</Text>
          <SegmentedControl
            data={TIMER_DURATION_OPTIONS}
            onChange={handleDurationChange}
            size="xs"
            value={String(timerSettings.duration)}
          />
        </Group>
      )}
    </Stack>
  );
};
