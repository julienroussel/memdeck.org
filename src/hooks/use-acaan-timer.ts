import { ACAAN_TRAINER_TIMER_LSK } from "../constants";
import {
  type UseTimerSettingsResult,
  useTimerSettings,
} from "./use-timer-settings";

/**
 * Hook for managing ACAAN trainer timer settings.
 * Thin wrapper around useTimerSettings with the ACAAN-specific storage key.
 */
export const useAcaanTimer = (): UseTimerSettingsResult =>
  useTimerSettings(ACAAN_TRAINER_TIMER_LSK);
