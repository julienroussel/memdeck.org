import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLASHCARD_OPTION_LSK, NEIGHBOR_DIRECTION_LSK } from "../../constants";
import { createGatedSetterMock } from "../../test-utils/mock-local-db-setter";
import {
  type FlashcardMode,
  isFlashcardMode,
  isNeighborDirection,
  type NeighborDirection,
} from "../../types/flashcard";

let currentMode: FlashcardMode = "bothmodes";
let currentDirection: NeighborDirection = "random";

// `mockSetValueSucceeds` gates all three setters together — flip to false
// before a handler call to simulate a Mantine-swallowed quota-exceeded write.
let mockSetValueSucceeds = true;
const succeeds = () => mockSetValueSucceeds;

const mockSetMode = createGatedSetterMock<FlashcardMode>(succeeds, (v) => {
  currentMode = v;
});
const mockSetNeighborDirection = createGatedSetterMock<NeighborDirection>(
  succeeds,
  (v) => {
    currentDirection = v;
  }
);
const mockSetTimerEnabled = createGatedSetterMock<boolean>(succeeds);
const mockSetTimerDuration = vi.fn();
const mockTrackEvent = vi.fn();
const mockEmitFlashcardModeChanged = vi.fn();
const mockEmitNeighborDirectionChanged = vi.fn();

vi.mock("../../utils/localstorage", () => ({
  useLocalDb: vi.fn(),
}));

vi.mock("../../hooks/use-timer-settings", () => ({
  useTimerSettings: vi.fn(() => ({
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
const { handleLocalDbWriteFailed, reportLocalDbCorruption } = await import(
  "../../utils/localstorage-telemetry"
);
const { useFlashcardSettings } = await import("./use-flashcard-settings");

describe("useFlashcardSettings", () => {
  let result: { current: ReturnType<typeof useFlashcardSettings> };

  beforeEach(() => {
    currentMode = "bothmodes";
    currentDirection = "random";
    mockSetValueSucceeds = true;

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

  it("calls useLocalDb with correct keys, defaults, validators, and write/corrupt callbacks", () => {
    expect(mockedUseLocalDb).toHaveBeenCalledTimes(2);
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      FLASHCARD_OPTION_LSK,
      "bothmodes",
      isFlashcardMode,
      expect.objectContaining({
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      })
    );
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      NEIGHBOR_DIRECTION_LSK,
      "random",
      isNeighborDirection,
      expect.objectContaining({
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      })
    );
  });

  it("returns timer settings from useTimerSettings", () => {
    expect(result.current.timerSettings).toEqual({
      enabled: false,
      duration: 15,
    });
  });

  it("delegates setTimerDuration to useTimerSettings", () => {
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

      expect(mockSetMode).toHaveBeenCalledWith(
        "cardonly",
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockEmitFlashcardModeChanged).toHaveBeenCalledWith({
        mode: "cardonly",
      });
    });

    it("updates mode and emits event for 'numberonly'", () => {
      act(() => {
        result.current.handleModeChange("numberonly");
      });

      expect(mockSetMode).toHaveBeenCalledWith(
        "numberonly",
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockEmitFlashcardModeChanged).toHaveBeenCalledWith({
        mode: "numberonly",
      });
    });

    it("updates mode and emits event for 'bothmodes'", () => {
      act(() => {
        result.current.handleModeChange("bothmodes");
      });

      expect(mockSetMode).toHaveBeenCalledWith(
        "bothmodes",
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockEmitFlashcardModeChanged).toHaveBeenCalledWith({
        mode: "bothmodes",
      });
    });

    it("updates mode and emits event for 'neighbor'", () => {
      act(() => {
        result.current.handleModeChange("neighbor");
      });

      expect(mockSetMode).toHaveBeenCalledWith(
        "neighbor",
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
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

    it("does not emit FLASHCARD_MODE_CHANGED when the wrapped setter's write fails", () => {
      mockSetValueSucceeds = false;
      act(() => {
        result.current.handleModeChange("cardonly");
      });
      expect(mockSetMode).toHaveBeenCalledTimes(1);
      expect(mockEmitFlashcardModeChanged).not.toHaveBeenCalled();
      expect(currentMode).toBe("bothmodes");
    });
  });

  describe("handleDirectionChange", () => {
    it("updates direction and emits event for 'before'", () => {
      act(() => {
        result.current.handleDirectionChange("before");
      });

      expect(mockSetNeighborDirection).toHaveBeenCalledWith(
        "before",
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockEmitNeighborDirectionChanged).toHaveBeenCalledWith({
        direction: "before",
      });
    });

    it("updates direction and emits event for 'after'", () => {
      act(() => {
        result.current.handleDirectionChange("after");
      });

      expect(mockSetNeighborDirection).toHaveBeenCalledWith(
        "after",
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockEmitNeighborDirectionChanged).toHaveBeenCalledWith({
        direction: "after",
      });
    });

    it("updates direction and emits event for 'random'", () => {
      act(() => {
        result.current.handleDirectionChange("random");
      });

      expect(mockSetNeighborDirection).toHaveBeenCalledWith(
        "random",
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
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

    it("does not emit NEIGHBOR_DIRECTION_CHANGED when the wrapped setter's write fails", () => {
      mockSetValueSucceeds = false;
      act(() => {
        result.current.handleDirectionChange("before");
      });
      expect(mockSetNeighborDirection).toHaveBeenCalledTimes(1);
      expect(mockEmitNeighborDirectionChanged).not.toHaveBeenCalled();
      expect(currentDirection).toBe("random");
    });
  });

  describe("handleTimerEnabledChange", () => {
    it("tracks analytics event and enables timer", () => {
      act(() => {
        result.current.handleTimerEnabledChange(true);
      });

      expect(mockSetTimerEnabled).toHaveBeenCalledWith(
        true,
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "Settings",
        "Timer Enabled",
        "Flashcard"
      );
    });

    it("tracks analytics event and disables timer", () => {
      act(() => {
        result.current.handleTimerEnabledChange(false);
      });

      expect(mockSetTimerEnabled).toHaveBeenCalledWith(
        false,
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "Settings",
        "Timer Disabled",
        "Flashcard"
      );
    });

    it("does not track analytics when the wrapped setter's write fails", () => {
      mockSetValueSucceeds = false;
      act(() => {
        result.current.handleTimerEnabledChange(true);
      });
      expect(mockSetTimerEnabled).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
