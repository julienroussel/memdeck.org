import { useCallback } from "react";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";
import { analytics } from "../../services/analytics";
import type { TimerDuration, TimerSettings } from "../../types/timer";

type UseAcaanSettingsResult = {
  timerSettings: TimerSettings;
  setTimerDuration: (duration: TimerDuration) => void;
  handleTimerEnabledChange: (enabled: boolean) => void;
};

export const useAcaanSettings = (): UseAcaanSettingsResult => {
  const { timerSettings, setTimerEnabled, setTimerDuration } = useAcaanTimer();

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
    timerSettings,
    setTimerDuration,
    handleTimerEnabledChange,
  };
};
