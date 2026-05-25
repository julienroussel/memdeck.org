import { useCallback } from "react";
import { SPOT_CHECK_MODE_LSK, SPOT_CHECK_TIMER_LSK } from "../../constants";
import { useTimerSettings } from "../../hooks/use-timer-settings";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import { isSpotCheckMode, type SpotCheckMode } from "../../types/spot-check";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { useLocalDb } from "../../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../../utils/localstorage-telemetry";

type UseSpotCheckSettingsResult = {
  mode: SpotCheckMode;
  timerSettings: TimerSettings;
  setTimerDuration: (duration: TimerDuration) => void;
  handleModeChange: (value: SpotCheckMode) => void;
  handleTimerEnabledChange: (enabled: boolean) => void;
};

export const useSpotCheckSettings = (): UseSpotCheckSettingsResult => {
  const [mode, setMode] = useLocalDb<SpotCheckMode>(
    SPOT_CHECK_MODE_LSK,
    "missing",
    isSpotCheckMode,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useTimerSettings(SPOT_CHECK_TIMER_LSK);

  const handleModeChange = useCallback(
    (value: SpotCheckMode) => {
      setMode(value, {
        onSuccess: () => {
          eventBus.emit.SPOT_CHECK_MODE_CHANGED({ mode: value });
        },
      });
    },
    [setMode]
  );

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      setTimerEnabled(enabled, {
        onSuccess: () => {
          analytics.trackEvent(
            "Settings",
            `Timer ${enabled ? "Enabled" : "Disabled"}`,
            "SpotCheck"
          );
        },
      });
    },
    [setTimerEnabled]
  );

  return {
    mode,
    timerSettings,
    setTimerDuration,
    handleModeChange,
    handleTimerEnabledChange,
  };
};
