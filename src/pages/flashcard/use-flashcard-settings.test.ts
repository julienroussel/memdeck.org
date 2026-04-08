import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLASHCARD_OPTION_LSK, NEIGHBOR_DIRECTION_LSK } from "../../constants";
import {
  type FlashcardMode,
  isFlashcardMode,
  isNeighborDirection,
  type NeighborDirection,
} from "../../types/flashcard";

let currentMode: FlashcardMode = "bothmodes";
let currentDirection: NeighborDirection = "random";

const mockSetMode = vi.fn((value: FlashcardMode) => {
  currentMode = value;
});
const mockSetNeighborDirection = vi.fn((value: NeighborDirection) => {
  currentDirection = value;
});
const mockSetTimerEnabled = vi.fn();
const mockSetTimerDuration = vi.fn();
const mockTrackEvent = vi.fn();
const mockEmitFlashcardModeChanged = vi.fn();
const mockEmitNeighborDirectionChanged = vi.fn();

vi.mock("../../utils/localstorage", () => ({
  useLocalDb: vi.fn(),
}));

vi.mock("../../hooks/use-flashcard-timer", () => ({
  useFlashcardTimer: vi.fn(() => ({
    timerSettings: { enabled: false, duration: 15 },
    setTimerEnabled: mockSetTimerEnabled,
    setTimerDuration: mockSetTimerDuration,
  })),
}));

vi.mock("../../services/analytics", () => ({
  analytics: {
    trackEvent: mockTrackEvent,
  },
}));

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: {
      FLASHCARD_MODE_CHANGED: mockEmitFlashcardModeChanged,
      NEIGHBOR_DIRECTION_CHANGED: mockEmitNeighborDirectionChanged,
    },
  },
}));

const { useLocalDb } = await import("../../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);
const { useFlashcardSettings } = await import("./use-flashcard-settings");

describe("useFlashcardSettings", () => {
  let result: { current: ReturnType<typeof useFlashcardSettings> };

  beforeEach(() => {
    currentMode = "bothmodes";
    currentDirection = "random";

    // Cast intentional: mockImplementation cannot satisfy the generic useLocalDb<T> signature
    // for multiple T values. Argument matching by key avoids fragile call-order dependency.
    (mockedUseLocalDb.mockImplementation as (fn: unknown) => unknown)(
      (key: string) => {
        if (key === FLASHCARD_OPTION_LSK) {
          return [currentMode, mockSetMode, vi.fn()];
        }
        if (key === NEIGHBOR_DIRECTION_LSK) {
          return [currentDirection, mockSetNeighborDirection, vi.fn()];
        }
        throw new Error(`Unexpected useLocalDb key: ${key}`);
      }
    );

    ({ result } = renderHook(() => useFlashcardSettings()));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns default mode 'bothmodes'", () => {
    expect(result.current.mode).toBe("bothmodes");
  });

  it("returns default neighbor direction 'random'", () => {
    expect(result.current.neighborDirection).toBe("random");
  });

  it("calls useLocalDb with correct keys, defaults, and validator functions", () => {
    expect(mockedUseLocalDb).toHaveBeenCalledTimes(2);
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      FLASHCARD_OPTION_LSK,
      "bothmodes",
      isFlashcardMode
    );
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      NEIGHBOR_DIRECTION_LSK,
      "random",
      isNeighborDirection
    );
  });

  it("returns timer settings from useFlashcardTimer", () => {
    expect(result.current.timerSettings).toEqual({
      enabled: false,
      duration: 15,
    });
  });

  it("delegates setTimerDuration to useFlashcardTimer", () => {
    act(() => {
      result.current.setTimerDuration(30);
    });

    expect(mockSetTimerDuration).toHaveBeenCalledWith(30);
  });

  describe("handleModeChange", () => {
    it("updates mode and emits event for 'cardonly'", () => {
      act(() => {
        result.current.handleModeChange("cardonly");
      });

      expect(mockSetMode).toHaveBeenCalledWith("cardonly");
      expect(mockEmitFlashcardModeChanged).toHaveBeenCalledWith({
        mode: "cardonly",
      });
    });

    it("updates mode and emits event for 'numberonly'", () => {
      act(() => {
        result.current.handleModeChange("numberonly");
      });

      expect(mockSetMode).toHaveBeenCalledWith("numberonly");
      expect(mockEmitFlashcardModeChanged).toHaveBeenCalledWith({
        mode: "numberonly",
      });
    });

    it("updates mode and emits event for 'bothmodes'", () => {
      act(() => {
        result.current.handleModeChange("bothmodes");
      });

      expect(mockSetMode).toHaveBeenCalledWith("bothmodes");
      expect(mockEmitFlashcardModeChanged).toHaveBeenCalledWith({
        mode: "bothmodes",
      });
    });

    it("updates mode and emits event for 'neighbor'", () => {
      act(() => {
        result.current.handleModeChange("neighbor");
      });

      expect(mockSetMode).toHaveBeenCalledWith("neighbor");
      expect(mockEmitFlashcardModeChanged).toHaveBeenCalledWith({
        mode: "neighbor",
      });
    });

    it("rejects an invalid mode value", () => {
      act(() => {
        // Cast intentional: testing rejection of invalid values that bypass TypeScript's type system at runtime
        result.current.handleModeChange("invalid" as FlashcardMode);
      });

      expect(mockSetMode).not.toHaveBeenCalled();
      expect(mockEmitFlashcardModeChanged).not.toHaveBeenCalled();
    });
  });

  describe("handleDirectionChange", () => {
    it("updates direction and emits event for 'before'", () => {
      act(() => {
        result.current.handleDirectionChange("before");
      });

      expect(mockSetNeighborDirection).toHaveBeenCalledWith("before");
      expect(mockEmitNeighborDirectionChanged).toHaveBeenCalledWith({
        direction: "before",
      });
    });

    it("updates direction and emits event for 'after'", () => {
      act(() => {
        result.current.handleDirectionChange("after");
      });

      expect(mockSetNeighborDirection).toHaveBeenCalledWith("after");
      expect(mockEmitNeighborDirectionChanged).toHaveBeenCalledWith({
        direction: "after",
      });
    });

    it("updates direction and emits event for 'random'", () => {
      act(() => {
        result.current.handleDirectionChange("random");
      });

      expect(mockSetNeighborDirection).toHaveBeenCalledWith("random");
      expect(mockEmitNeighborDirectionChanged).toHaveBeenCalledWith({
        direction: "random",
      });
    });

    it("rejects an invalid direction value", () => {
      act(() => {
        // Cast intentional: testing rejection of invalid values that bypass TypeScript's type system at runtime
        result.current.handleDirectionChange("invalid" as NeighborDirection);
      });

      expect(mockSetNeighborDirection).not.toHaveBeenCalled();
      expect(mockEmitNeighborDirectionChanged).not.toHaveBeenCalled();
    });
  });

  describe("handleTimerEnabledChange", () => {
    it("tracks analytics event and enables timer", () => {
      act(() => {
        result.current.handleTimerEnabledChange(true);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "Settings",
        "Timer Enabled",
        "Flashcard"
      );
      expect(mockSetTimerEnabled).toHaveBeenCalledWith(true);
    });

    it("tracks analytics event and disables timer", () => {
      act(() => {
        result.current.handleTimerEnabledChange(false);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "Settings",
        "Timer Disabled",
        "Flashcard"
      );
      expect(mockSetTimerEnabled).toHaveBeenCalledWith(false);
    });
  });
});
