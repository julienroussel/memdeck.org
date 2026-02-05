import { ACAAN_TRAINER_TIMER_LSK } from "../constants";
import { useTimerSettings } from "./use-timer-settings";

/**
 * Hook for managing ACAAN trainer timer settings.
 * Thin wrapper around useTimerSettings with the ACAAN-specific storage key.
 */
export const useAcaanTimer = () => useTimerSettings(ACAAN_TRAINER_TIMER_LSK);
