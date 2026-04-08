import { useCallback } from "react";
import { FLASHCARD_OPTION_LSK, NEIGHBOR_DIRECTION_LSK } from "../../constants";
import { useFlashcardTimer } from "../../hooks/use-flashcard-timer";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import {
  type FlashcardMode,
  isFlashcardMode,
  isNeighborDirection,
  type NeighborDirection,
} from "../../types/flashcard";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { useLocalDb } from "../../utils/localstorage";

type UseFlashcardSettingsResult = {
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  timerSettings: TimerSettings;
  setTimerDuration: (duration: TimerDuration) => void;
  handleModeChange: (value: FlashcardMode) => void;
  handleDirectionChange: (value: NeighborDirection) => void;
  handleTimerEnabledChange: (enabled: boolean) => void;
};

export const useFlashcardSettings = (): UseFlashcardSettingsResult => {
  const [mode, setMode] = useLocalDb<FlashcardMode>(
    FLASHCARD_OPTION_LSK,
    "bothmodes",
    isFlashcardMode
  );
  const [neighborDirection, setNeighborDirection] =
    useLocalDb<NeighborDirection>(
      NEIGHBOR_DIRECTION_LSK,
      "random",
      isNeighborDirection
    );

  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useFlashcardTimer();

  const handleModeChange = useCallback(
    (value: FlashcardMode) => {
      if (!isFlashcardMode(value)) {
        return;
      }
      setMode(value);
      eventBus.emit.FLASHCARD_MODE_CHANGED({ mode: value });
    },
    [setMode]
  );

  const handleDirectionChange = useCallback(
    (value: NeighborDirection) => {
      if (!isNeighborDirection(value)) {
        return;
      }
      setNeighborDirection(value);
      eventBus.emit.NEIGHBOR_DIRECTION_CHANGED({ direction: value });
    },
    [setNeighborDirection]
  );

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      analytics.trackEvent(
        "Settings",
        `Timer ${enabled ? "Enabled" : "Disabled"}`,
        "Flashcard"
      );
      setTimerEnabled(enabled);
    },
    [setTimerEnabled]
  );

  return {
    mode,
    neighborDirection,
    timerSettings,
    setTimerDuration,
    handleModeChange,
    handleDirectionChange,
    handleTimerEnabledChange,
  };
};
