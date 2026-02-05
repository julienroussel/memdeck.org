import { useCallback } from "react";
import { ACAAN_TRAINER_TIMER_LSK } from "../constants";
import { useLocalDb } from "../utils/localstorage";

export type TimerDuration = 10 | 15 | 30;

type TimerSettings = {
  enabled: boolean;
  duration: TimerDuration;
};

const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  enabled: false,
  duration: 15,
};

type UseAcaanTimerResult = {
  timerSettings: TimerSettings;
  setTimerEnabled: (enabled: boolean) => void;
  setTimerDuration: (duration: TimerDuration) => void;
};

/**
 * Hook for managing ACAAN trainer timer settings.
 * Settings are stored in localStorage and persist across sessions.
 */
export const useAcaanTimer = (): UseAcaanTimerResult => {
  const [timerSettings, setTimerSettings] = useLocalDb<TimerSettings>(
    ACAAN_TRAINER_TIMER_LSK,
    DEFAULT_TIMER_SETTINGS
  );

  const setTimerEnabled = useCallback(
    (enabled: boolean) => {
      setTimerSettings((prev) => ({
        ...prev,
        enabled,
      }));
    },
    [setTimerSettings]
  );

  const setTimerDuration = useCallback(
    (duration: TimerDuration) => {
      setTimerSettings((prev) => ({
        ...prev,
        duration,
      }));
    },
    [setTimerSettings]
  );

  return { timerSettings, setTimerEnabled, setTimerDuration };
};
