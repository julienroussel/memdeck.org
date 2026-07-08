import { useCallback } from "react";
import { ACAAN_TRAINER_TIMER_LSK } from "../../constants";
import { useTimerSettings } from "../../hooks/use-timer-settings";
import { analytics } from "../../services/analytics";
import type { TimerDuration, TimerSettings } from "../../types/timer";

type UseAcaanSettingsResult = {
  timerSettings: TimerSettings;
  setTimerDuration: (duration: TimerDuration) => void;
  handleTimerEnabledChange: (enabled: boolean) => void;
};

export const useAcaanSettings = (): UseAcaanSettingsResult => {
  const { timerSettings, setTimerEnabled, setTimerDuration } = useTimerSettings(
    ACAAN_TRAINER_TIMER_LSK
  );

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      setTimerEnabled(enabled, {
        onSuccess: () => {
          analytics.trackEvent(
            "Settings",
            `Timer ${enabled ? "Enabled" : "Disabled"}`,
            "ACAAN"
          );
        },
      });
    },
    [setTimerEnabled]
  );

  return {
    handleTimerEnabledChange,
    setTimerDuration,
    timerSettings,
  };
};
