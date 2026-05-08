import { useCallback } from "react";
import {
  DISTANCE_CONVENTION_LSK,
  DISTANCE_OPTION_LSK,
  DISTANCE_TIMER_LSK,
} from "../../constants";
import { useTimerSettings } from "../../hooks/use-timer-settings";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import {
  type DistanceConvention,
  type DistanceMode,
  isDistanceConvention,
  isDistanceMode,
} from "../../types/distance";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { useLocalDb } from "../../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../../utils/localstorage-telemetry";

type UseDistanceSettingsResult = {
  mode: DistanceMode;
  convention: DistanceConvention;
  timerSettings: TimerSettings;
  setTimerDuration: (duration: TimerDuration) => void;
  handleModeChange: (value: DistanceMode) => void;
  handleConventionChange: (value: DistanceConvention) => void;
  handleTimerEnabledChange: (enabled: boolean) => void;
};

export const useDistanceSettings = (): UseDistanceSettingsResult => {
  const [mode, setMode] = useLocalDb<DistanceMode>(
    DISTANCE_OPTION_LSK,
    "compute",
    isDistanceMode,
    reportLocalDbCorruption,
    handleLocalDbWriteFailed
  );
  const [convention, setConvention] = useLocalDb<DistanceConvention>(
    DISTANCE_CONVENTION_LSK,
    "cyclic",
    isDistanceConvention,
    reportLocalDbCorruption,
    handleLocalDbWriteFailed
  );

  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useTimerSettings(DISTANCE_TIMER_LSK);

  const handleModeChange = useCallback(
    (value: DistanceMode) => {
      setMode(value, {
        onSuccess: () => {
          eventBus.emit.DISTANCE_MODE_CHANGED({ mode: value });
        },
      });
    },
    [setMode]
  );

  const handleConventionChange = useCallback(
    (value: DistanceConvention) => {
      setConvention(value, {
        onSuccess: () => {
          eventBus.emit.DISTANCE_CONVENTION_CHANGED({ convention: value });
        },
      });
    },
    [setConvention]
  );

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      setTimerEnabled(enabled, {
        onSuccess: () => {
          analytics.trackEvent(
            "Settings",
            `Timer ${enabled ? "Enabled" : "Disabled"}`,
            "Distance"
          );
        },
      });
    },
    [setTimerEnabled]
  );

  return {
    mode,
    convention,
    timerSettings,
    setTimerDuration,
    handleModeChange,
    handleConventionChange,
    handleTimerEnabledChange,
  };
};
