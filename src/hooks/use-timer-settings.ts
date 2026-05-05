import { useCallback } from "react";
import type {
  ACAAN_TRAINER_TIMER_LSK,
  DISTANCE_TIMER_LSK,
  FLASHCARD_TIMER_LSK,
  SPOT_CHECK_TIMER_LSK,
} from "../constants";
import type { TimerDuration, TimerSettings } from "../types/timer";
import { useLocalDb } from "../utils/localstorage";
import { reportLocalDbCorruption } from "../utils/localstorage-telemetry";

/**
 * Allowed timer durations as a runtime set, kept in sync with the
 * `TimerDuration` literal union via `satisfies`. If `TimerDuration` ever
 * gains or drops a value, this tuple must be updated or the type-check fails.
 */
const TIMER_DURATION_VALUES = [
  10, 15, 30,
] as const satisfies readonly TimerDuration[];

const TIMER_DURATIONS: ReadonlySet<number> = new Set(TIMER_DURATION_VALUES);

const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  enabled: false,
  duration: 15,
};

const isTimerDuration = (value: unknown): value is TimerDuration =>
  typeof value === "number" && TIMER_DURATIONS.has(value);

export const isTimerSettings = (value: unknown): value is TimerSettings =>
  typeof value === "object" &&
  value !== null &&
  "enabled" in value &&
  typeof value.enabled === "boolean" &&
  "duration" in value &&
  isTimerDuration(value.duration);

export type UseTimerSettingsResult = {
  timerSettings: TimerSettings;
  setTimerEnabled: (enabled: boolean) => void;
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
    reportLocalDbCorruption
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
