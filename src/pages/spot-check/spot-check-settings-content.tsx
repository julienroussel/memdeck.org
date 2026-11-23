import { Divider, Radio, Stack, VisuallyHidden } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import type { SpotCheckMode } from "../../types/spot-check";
import {
  isSpotCheckMode,
  SPOT_CHECK_MODE_OPTIONS,
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
      {/* A hidden label names the radiogroup: Mantine sets it as the group's aria-labelledby,
          while an aria-label on Radio.Group lands on the wrapper. labelProps makes it a block,
          so Mantine's inline-block label adds no line of height above the radios. */}
      <Radio.Group
        label={<VisuallyHidden>{t("spotCheck.modeAriaLabel")}</VisuallyHidden>}
        labelProps={{ display: "block" }}
        onChange={handleModeChange}
        value={mode}
      >
        <Stack gap="xs">
          {SPOT_CHECK_MODE_OPTIONS.map((opt) => (
            <Radio
              description={t(opt.descriptionKey)}
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
