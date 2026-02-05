import { FLASHCARD_TIMER_LSK } from "../constants";
import { useTimerSettings } from "./use-timer-settings";

/**
 * Hook for managing Flashcard trainer timer settings.
 * Thin wrapper around useTimerSettings with the Flashcard-specific storage key.
 */
export const useFlashcardTimer = () => useTimerSettings(FLASHCARD_TIMER_LSK);
