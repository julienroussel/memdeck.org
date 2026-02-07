import { useCallback } from "react";
import type { TimerDuration, TimerSettings } from "../types/timer";
import { useLocalDb } from "../utils/localstorage";

const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  enabled: false,
  duration: 15,
};

export type UseTimerSettingsResult = {
  timerSettings: TimerSettings;
  setTimerEnabled: (enabled: boolean) => void;
  setTimerDuration: (duration: TimerDuration) => void;
};

/**
 * Generic hook for managing timer settings.
 * Settings are stored in localStorage and persist across sessions.
 *
 * @param storageKey - The localStorage key to use for persisting settings
 */
export const useTimerSettings = (
  storageKey: string
): UseTimerSettingsResult => {
  const [timerSettings, setTimerSettings] = useLocalDb<TimerSettings>(
    storageKey,
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
