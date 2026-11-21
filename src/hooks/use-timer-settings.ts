import { useCallback } from "react";
import type {
  ACAAN_TRAINER_TIMER_LSK,
  DISTANCE_TIMER_LSK,
  FLASHCARD_TIMER_LSK,
  SPOT_CHECK_TIMER_LSK,
} from "../constants";
import type { TimerDuration, TimerSettings } from "../types/timer";
import type { UseLocalDbSetOptions } from "../utils/localstorage";
import { useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";
import { isValidDuration } from "../utils/timer";

const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  duration: 15,
  enabled: false,
};

const isTimerDuration = (value: unknown): value is TimerDuration =>
  typeof value === "number" && isValidDuration(value);

export const isTimerSettings = (value: unknown): value is TimerSettings =>
  typeof value === "object" &&
  value !== null &&
  "enabled" in value &&
  typeof value.enabled === "boolean" &&
  "duration" in value &&
  isTimerDuration(value.duration);

export type UseTimerSettingsResult = {
  timerSettings: TimerSettings;
  setTimerEnabled: (enabled: boolean, options?: UseLocalDbSetOptions) => void;
  setTimerDuration: (duration: TimerDuration) => void;
};

type TimerStorageKey =
  | typeof FLASHCARD_TIMER_LSK
  | typeof ACAAN_TRAINER_TIMER_LSK
  | typeof SPOT_CHECK_TIMER_LSK
  | typeof DISTANCE_TIMER_LSK;

/**
 * Generic hook for managing timer settings.
 * Settings are stored in localStorage and persist across sessions.
 *
 * @param storageKey - The localStorage key to use for persisting settings
 */
export const useTimerSettings = (
  storageKey: TimerStorageKey
): UseTimerSettingsResult => {
  // Corruption recovery is reset-on-write — the on-disk value is low-stakes
  // (two timer fields) so we let the next user interaction overwrite it; see
  // useStackLimits for the locking discipline used when data loss is
  // unrecoverable.
  const [timerSettings, setTimerSettings] = useLocalDb<TimerSettings>(
    storageKey,
    DEFAULT_TIMER_SETTINGS,
    isTimerSettings,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  const setTimerEnabled = useCallback(
    (enabled: boolean, options?: UseLocalDbSetOptions): void => {
      setTimerSettings(
        (prev) => ({
          ...prev,
          enabled,
        }),
        options
      );
    },
    [setTimerSettings]
  );

  const setTimerDuration = useCallback(
    (duration: TimerDuration): void => {
      setTimerSettings((prev) => ({
        ...prev,
        duration,
      }));
    },
    [setTimerSettings]
  );

  return { setTimerDuration, setTimerEnabled, timerSettings };
};
