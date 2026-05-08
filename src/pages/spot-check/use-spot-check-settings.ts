import { useCallback } from "react";
import { SPOT_CHECK_MODE_LSK } from "../../constants";
import { useSpotCheckTimer } from "../../hooks/use-spot-check-timer";
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
    reportLocalDbCorruption,
    handleLocalDbWriteFailed
  );

  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useSpotCheckTimer();

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
