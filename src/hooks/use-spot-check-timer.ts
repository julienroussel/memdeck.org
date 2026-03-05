import { SPOT_CHECK_TIMER_LSK } from "../constants";
import {
  type UseTimerSettingsResult,
  useTimerSettings,
} from "./use-timer-settings";

/**
 * Hook for managing Spot Check trainer timer settings.
 * Thin wrapper around useTimerSettings with the Spot Check-specific storage key.
 */
export const useSpotCheckTimer = (): UseTimerSettingsResult =>
  useTimerSettings(SPOT_CHECK_TIMER_LSK);
