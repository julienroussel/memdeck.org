import { Divider, Radio, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import {
  isSpotCheckMode,
  SPOT_CHECK_MODE_OPTIONS,
  type SpotCheckMode,
} from "../../types/spot-check";
import type { TimerDuration, TimerSettings } from "../../types/timer";

type SpotCheckSettingsContentProps = {
  mode: SpotCheckMode;
  onModeChange: (mode: SpotCheckMode) => void;
  onDurationChange: (duration: TimerDuration) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  timerSettings: TimerSettings;
};

export const SpotCheckSettingsContent = ({
  mode,
  onModeChange,
  onDurationChange,
  onTimerEnabledChange,
  timerSettings,
}: SpotCheckSettingsContentProps) => {
  const { t } = useTranslation();

  const handleModeChange = (value: string) => {
    if (isSpotCheckMode(value)) {
      onModeChange(value);
    }
  };

  return (
    <Stack gap="md" p="xs">
      <Radio.Group
        aria-label={t("spotCheck.modeAriaLabel")}
        onChange={handleModeChange}
        value={mode}
      >
        <Stack gap="xs">
          {SPOT_CHECK_MODE_OPTIONS.map((opt) => (
            <Radio
              description={
                <Text c="dimmed" size="xs">
                  {t(opt.descriptionKey)}
                </Text>
              }
              key={opt.value}
              label={t(opt.labelKey)}
              value={opt.value}
            />
          ))}
        </Stack>
      </Radio.Group>
      <Divider />
      <TimerSettingsControl
        onDurationChange={onDurationChange}
        onEnabledChange={onTimerEnabledChange}
        timerSettings={timerSettings}
      />
    </Stack>
  );
};
