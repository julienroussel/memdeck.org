import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISTANCE_CONVENTION_LSK,
  DISTANCE_OPTION_LSK,
  DISTANCE_TIMER_LSK,
} from "../../constants";
import { createGatedSetterMock } from "../../test-utils/mock-local-db-setter";
import {
  type DistanceConvention,
  type DistanceMode,
  isDistanceConvention,
  isDistanceMode,
} from "../../types/distance";

let currentMode: DistanceMode = "compute";
let currentConvention: DistanceConvention = "cyclic";

// `mockSetValueSucceeds` gates all three setters together — flip to false
// before a handler call to simulate a Mantine-swallowed quota-exceeded write.
let mockSetValueSucceeds = true;
const succeeds = () => mockSetValueSucceeds;

const mockSetMode = createGatedSetterMock<DistanceMode>(succeeds, (v) => {
  currentMode = v;
});
const mockSetConvention = createGatedSetterMock<DistanceConvention>(
  succeeds,
  (v) => {
    currentConvention = v;
  }
);
const mockSetTimerEnabled = createGatedSetterMock<boolean>(succeeds);
const mockSetTimerDuration = vi.fn();
const mockTrackEvent = vi.fn();
const mockEmitDistanceModeChanged = vi.fn();
const mockEmitDistanceConventionChanged = vi.fn();

vi.mock("../../utils/localstorage", () => ({
  useLocalDb: vi.fn(),
}));

vi.mock("../../hooks/use-timer-settings", () => ({
  useTimerSettings: vi.fn(() => ({
    setTimerDuration: mockSetTimerDuration,
    setTimerEnabled: mockSetTimerEnabled,
    timerSettings: { duration: 15, enabled: false },
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
      DISTANCE_CONVENTION_CHANGED: mockEmitDistanceConventionChanged,
      DISTANCE_MODE_CHANGED: mockEmitDistanceModeChanged,
    },
  },
}));

const { useLocalDb } = await import("../../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);
const { handleLocalDbWriteFailed, reportLocalDbCorruption } = await import(
  "../../utils/localstorage-telemetry"
);
const { useTimerSettings } = await import("../../hooks/use-timer-settings");
const mockedUseTimerSettings = vi.mocked(useTimerSettings);
const { useDistanceSettings } = await import("./use-distance-settings");

describe("useDistanceSettings", () => {
  let result: { current: ReturnType<typeof useDistanceSettings> };

  beforeEach(() => {
    currentMode = "compute";
    currentConvention = "cyclic";
    mockSetValueSucceeds = true;

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

  it("calls useLocalDb with correct keys, defaults, validators, and write/corrupt callbacks", () => {
    expect(mockedUseLocalDb).toHaveBeenCalledTimes(2);
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      DISTANCE_OPTION_LSK,
      "compute",
      isDistanceMode,
      expect.objectContaining({
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      })
    );
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      DISTANCE_CONVENTION_LSK,
      "cyclic",
      isDistanceConvention,
      expect.objectContaining({
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      })
    );
  });

  it("calls useTimerSettings with the distance LSK", () => {
    expect(mockedUseTimerSettings).toHaveBeenCalledWith(DISTANCE_TIMER_LSK);
  });

  it("returns timer settings from useTimerSettings", () => {
    expect(result.current.timerSettings).toEqual({
      duration: 15,
      enabled: false,
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
        expect(mockSetMode).toHaveBeenCalledWith(
          value,
          expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockEmitDistanceModeChanged).toHaveBeenCalledWith({
          mode: value,
        });
      });
    }
    // Runtime input validation lives in DistanceSettingsContent, where the
    // SegmentedControl emits a raw string. By the time handleModeChange is
    // reached, the value is already narrowed to DistanceMode.

    it("does not emit DISTANCE_MODE_CHANGED when the wrapped setter's write fails", () => {
      mockSetValueSucceeds = false;
      act(() => {
        result.current.handleModeChange("apply");
      });
      expect(mockSetMode).toHaveBeenCalledTimes(1);
      expect(mockEmitDistanceModeChanged).not.toHaveBeenCalled();
      expect(currentMode).toBe("compute");
    });
  });

  describe("handleConventionChange", () => {
    for (const value of ["cyclic", "signed"] as const) {
      it(`updates convention and emits event for '${value}'`, () => {
        act(() => {
          result.current.handleConventionChange(value);
        });
        expect(mockSetConvention).toHaveBeenCalledWith(
          value,
          expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockEmitDistanceConventionChanged).toHaveBeenCalledWith({
          convention: value,
        });
      });
    }
    // Runtime input validation lives in DistanceSettingsContent.

    it("does not emit DISTANCE_CONVENTION_CHANGED when the wrapped setter's write fails", () => {
      mockSetValueSucceeds = false;
      act(() => {
        result.current.handleConventionChange("signed");
      });
      expect(mockSetConvention).toHaveBeenCalledTimes(1);
      expect(mockEmitDistanceConventionChanged).not.toHaveBeenCalled();
      expect(currentConvention).toBe("cyclic");
    });
  });

  describe("handleTimerEnabledChange", () => {
    it("tracks analytics and enables timer", () => {
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
        "Distance"
      );
    });

    it("tracks analytics and disables timer", () => {
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
        "Distance"
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
