import { Divider, SegmentedControl, Stack } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import {
  DISTANCE_CONVENTION_OPTIONS,
  DISTANCE_MODE_OPTIONS,
  type DistanceConvention,
  type DistanceMode,
  isDistanceConvention,
  isDistanceMode,
} from "../../types/distance";
import type { TimerDuration, TimerSettings } from "../../types/timer";

type DistanceSettingsContentProps = {
  mode: DistanceMode;
  convention: DistanceConvention;
  timerSettings: TimerSettings;
  onModeChange: (mode: DistanceMode) => void;
  onConventionChange: (convention: DistanceConvention) => void;
  onDurationChange: (duration: TimerDuration) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
};

export const DistanceSettingsContent = ({
  mode,
  convention,
  timerSettings,
  onModeChange,
  onConventionChange,
  onDurationChange,
  onTimerEnabledChange,
}: DistanceSettingsContentProps) => {
  const { t } = useTranslation();

  const modeData = useMemo(
    () =>
      DISTANCE_MODE_OPTIONS.map((opt) => ({
        label: t(opt.labelKey),
        value: opt.value,
      })),
    [t]
  );

  const conventionData = useMemo(
    () =>
      DISTANCE_CONVENTION_OPTIONS.map((opt) => ({
        label: t(opt.labelKey),
        value: opt.value,
      })),
    [t]
  );

  const handleModeChange = (value: string) => {
    if (isDistanceMode(value)) {
      onModeChange(value);
    }
  };

  const handleConventionChange = (value: string) => {
    if (isDistanceConvention(value)) {
      onConventionChange(value);
    }
  };

  return (
    <Stack gap="md" p="xs">
      <SegmentedControl
        aria-label={t("distance.modeAriaLabel")}
        data={modeData}
        fullWidth
        onChange={handleModeChange}
        size="xs"
        value={mode}
      />
      <SegmentedControl
        aria-label={t("distance.conventionAriaLabel")}
        data={conventionData}
        fullWidth
        onChange={handleConventionChange}
        size="xs"
        value={convention}
      />
      <Divider />
      <TimerSettingsControl
        onDurationChange={onDurationChange}
        onEnabledChange={onTimerEnabledChange}
        timerSettings={timerSettings}
      />
    </Stack>
  );
};
