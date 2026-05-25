import { useCallback } from "react";
import {
  FLASHCARD_OPTION_LSK,
  FLASHCARD_TIMER_LSK,
  NEIGHBOR_DIRECTION_LSK,
} from "../../constants";
import { useTimerSettings } from "../../hooks/use-timer-settings";
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
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../../utils/localstorage-telemetry";

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
    isFlashcardMode,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );
  const [neighborDirection, setNeighborDirection] =
    useLocalDb<NeighborDirection>(
      NEIGHBOR_DIRECTION_LSK,
      "random",
      isNeighborDirection,
      {
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      }
    );

  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useTimerSettings(FLASHCARD_TIMER_LSK);

  const handleModeChange = useCallback(
    (value: FlashcardMode) => {
      if (!isFlashcardMode(value)) {
        return;
      }
      setMode(value, {
        onSuccess: () => {
          eventBus.emit.FLASHCARD_MODE_CHANGED({ mode: value });
        },
      });
    },
    [setMode]
  );

  const handleDirectionChange = useCallback(
    (value: NeighborDirection) => {
      if (!isNeighborDirection(value)) {
        return;
      }
      setNeighborDirection(value, {
        onSuccess: () => {
          eventBus.emit.NEIGHBOR_DIRECTION_CHANGED({ direction: value });
        },
      });
    },
    [setNeighborDirection]
  );

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      setTimerEnabled(enabled, {
        onSuccess: () => {
          analytics.trackEvent(
            "Settings",
            `Timer ${enabled ? "Enabled" : "Disabled"}`,
            "Flashcard"
          );
        },
      });
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
