import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SPOT_CHECK_MODE_LSK } from "../../constants";
import { createGatedSetterMock } from "../../test-utils/mock-local-db-setter";
import { isSpotCheckMode, type SpotCheckMode } from "../../types/spot-check";

let currentMode: SpotCheckMode = "missing";

// `mockSetValueSucceeds` gates both setters together — flip to false before
// a handler call to simulate a Mantine-swallowed quota-exceeded write.
let mockSetValueSucceeds = true;
const succeeds = () => mockSetValueSucceeds;

const mockSetMode = createGatedSetterMock<SpotCheckMode>(succeeds, (v) => {
  currentMode = v;
});
const mockSetTimerEnabled = createGatedSetterMock<boolean>(succeeds);
const mockSetTimerDuration = vi.fn();
const mockTrackEvent = vi.fn();
const mockEmitSpotCheckModeChanged = vi.fn();

vi.mock("../../utils/localstorage", () => ({
  useLocalDb: vi.fn(),
}));

vi.mock("../../hooks/use-spot-check-timer", () => ({
  useSpotCheckTimer: vi.fn(() => ({
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
      SPOT_CHECK_MODE_CHANGED: mockEmitSpotCheckModeChanged,
    },
  },
}));

const { useLocalDb } = await import("../../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);
const { handleLocalDbWriteFailed, reportLocalDbCorruption } = await import(
  "../../utils/localstorage-telemetry"
);
const { useSpotCheckSettings } = await import("./use-spot-check-settings");

describe("useSpotCheckSettings", () => {
  let result: { current: ReturnType<typeof useSpotCheckSettings> };

  beforeEach(() => {
    currentMode = "missing";
    mockSetValueSucceeds = true;

    // Cast intentional: mockImplementation cannot satisfy generic useLocalDb<T> for multiple T.
    (mockedUseLocalDb.mockImplementation as (fn: unknown) => unknown)(
      (key: string) => {
        if (key === SPOT_CHECK_MODE_LSK) {
          return [currentMode, mockSetMode, vi.fn()];
        }
        throw new Error(`Unexpected useLocalDb key: ${key}`);
      }
    );

    ({ result } = renderHook(() => useSpotCheckSettings()));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns default mode 'missing'", () => {
    expect(result.current.mode).toBe("missing");
  });

  it("calls useLocalDb with SPOT_CHECK_MODE_LSK, default, validator, and write/corrupt callbacks", () => {
    expect(mockedUseLocalDb).toHaveBeenCalledTimes(1);
    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      SPOT_CHECK_MODE_LSK,
      "missing",
      isSpotCheckMode,
      expect.objectContaining({
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      })
    );
  });

  it("returns timer settings from useSpotCheckTimer", () => {
    expect(result.current.timerSettings).toEqual({
      enabled: false,
      duration: 15,
    });
  });

  it("delegates setTimerDuration to useSpotCheckTimer", () => {
    act(() => {
      result.current.setTimerDuration(30);
    });
    expect(mockSetTimerDuration).toHaveBeenCalledWith(30);
  });

  describe("handleModeChange", () => {
    for (const value of ["missing", "swapped", "moved"] as const) {
      it(`updates mode and emits event for '${value}'`, () => {
        act(() => {
          result.current.handleModeChange(value);
        });
        expect(mockSetMode).toHaveBeenCalledWith(
          value,
          expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockEmitSpotCheckModeChanged).toHaveBeenCalledWith({
          mode: value,
        });
      });
    }

    it("does not emit SPOT_CHECK_MODE_CHANGED when the wrapped setter's write fails", () => {
      mockSetValueSucceeds = false;
      act(() => {
        result.current.handleModeChange("swapped");
      });
      expect(mockSetMode).toHaveBeenCalledTimes(1);
      expect(mockEmitSpotCheckModeChanged).not.toHaveBeenCalled();
      expect(currentMode).toBe("missing");
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
        "SpotCheck"
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
        "SpotCheck"
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
