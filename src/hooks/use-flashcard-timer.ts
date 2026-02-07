import { FLASHCARD_TIMER_LSK } from "../constants";
import {
  type UseTimerSettingsResult,
  useTimerSettings,
} from "./use-timer-settings";

/**
 * Hook for managing Flashcard trainer timer settings.
 * Thin wrapper around useTimerSettings with the Flashcard-specific storage key.
 */
export const useFlashcardTimer = (): UseTimerSettingsResult =>
  useTimerSettings(FLASHCARD_TIMER_LSK);
