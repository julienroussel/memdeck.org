import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISTANCE_CONVENTION_LSK,
  DISTANCE_OPTION_LSK,
  DISTANCE_TIMER_LSK,
} from "../../constants";
import {
  type DistanceConvention,
  type DistanceMode,
  isDistanceConvention,
  isDistanceMode,
} from "../../types/distance";

let currentMode: DistanceMode = "compute";
let currentConvention: DistanceConvention = "cyclic";

const mockSetMode = vi.fn((value: DistanceMode) => {
  currentMode = value;
});
const mockSetConvention = vi.fn((value: DistanceConvention) => {
  currentConvention = value;
});
const mockSetTimerEnabled = vi.fn();
const mockSetTimerDuration = vi.fn();
const mockTrackEvent = vi.fn();
const mockEmitDistanceModeChanged = vi.fn();
const mockEmitDistanceConventionChanged = vi.fn();

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
      DISTANCE_MODE_CHANGED: mockEmitDistanceModeChanged,
      DISTANCE_CONVENTION_CHANGED: mockEmitDistanceConventionChanged,
    },
  },
}));

const { useLocalDb } = await import("../../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);
const { useTimerSettings } = await import("../../hooks/use-timer-settings");
const mockedUseTimerSettings = vi.mocked(useTimerSettings);
const { useDistanceSettings } = await import("./use-distance-settings");

describe("useDistanceSettings", () => {
  let result: { current: ReturnType<typeof useDistanceSettings> };

  beforeEach(() => {
    currentMode = "compute";
    currentConvention = "cyclic";

    // Cast intentional: mockImplementation cannot satisfy generic useLocalDb<T> for multiple T.
    (mockedUseLocalDb.mockImplementation as (fn: unknown) => unknown)(
      (key: string) => {
        if (key === DISTANCE_OPTION_LSK) {
          return [currentMode, mockSetMode, vi.fn()];
        }
        if (key === DISTANCE_CONVENTION_LSK) {
          return [currentConvention, mockSetConvention, vi.fn()];
        }
        throw new Error(`Unexpected useLocalDb key: ${key}`);
      }
    );

    ({ result } = renderHook(() => useDistanceSettings()));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns default mode 'compute'", () => {
    expect(result.current.mode).toBe("compute");
  });

  it("returns default convention 'cyclic'", () => {
    expect(result.current.convention).toBe("cyclic");
  });

  it("calls useLocalDb with correct keys, defaults, and validators", () => {
    expect(mockedUseLocalDb).toHaveBeenCalledTimes(2);
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      DISTANCE_OPTION_LSK,
      "compute",
      isDistanceMode,
      expect.any(Function)
    );
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      DISTANCE_CONVENTION_LSK,
      "cyclic",
      isDistanceConvention,
      expect.any(Function)
    );
  });

  it("calls useTimerSettings with the distance LSK", () => {
    expect(mockedUseTimerSettings).toHaveBeenCalledWith(DISTANCE_TIMER_LSK);
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
    for (const value of ["compute", "apply", "both"] as const) {
      it(`updates mode and emits event for '${value}'`, () => {
        act(() => {
          result.current.handleModeChange(value);
        });
        expect(mockSetMode).toHaveBeenCalledWith(value);
        expect(mockEmitDistanceModeChanged).toHaveBeenCalledWith({
          mode: value,
        });
      });
    }
    // Runtime input validation lives in DistanceSettingsContent, where the
    // SegmentedControl emits a raw string. By the time handleModeChange is
    // reached, the value is already narrowed to DistanceMode.
  });

  describe("handleConventionChange", () => {
    for (const value of ["cyclic", "signed"] as const) {
      it(`updates convention and emits event for '${value}'`, () => {
        act(() => {
          result.current.handleConventionChange(value);
        });
        expect(mockSetConvention).toHaveBeenCalledWith(value);
        expect(mockEmitDistanceConventionChanged).toHaveBeenCalledWith({
          convention: value,
        });
      });
    }
    // Runtime input validation lives in DistanceSettingsContent.
  });

  describe("handleTimerEnabledChange", () => {
    it("tracks analytics and enables timer", () => {
      act(() => {
        result.current.handleTimerEnabledChange(true);
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "Settings",
        "Timer Enabled",
        "Distance"
      );
      expect(mockSetTimerEnabled).toHaveBeenCalledWith(true);
    });

    it("tracks analytics and disables timer", () => {
      act(() => {
        result.current.handleTimerEnabledChange(false);
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "Settings",
        "Timer Disabled",
        "Distance"
      );
      expect(mockSetTimerEnabled).toHaveBeenCalledWith(false);
    });
  });
});
