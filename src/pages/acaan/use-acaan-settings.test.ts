import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGatedSetterMock } from "../../test-utils/mock-local-db-setter";

let mockSetValueSucceeds = true;
const succeeds = () => mockSetValueSucceeds;

const mockSetTimerEnabled = createGatedSetterMock<boolean>(succeeds);
const mockSetTimerDuration = vi.fn();
const mockTrackEvent = vi.fn();

vi.mock("../../hooks/use-acaan-timer", () => ({
  useAcaanTimer: vi.fn(() => ({
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

const { useAcaanSettings } = await import("./use-acaan-settings");

describe("useAcaanSettings", () => {
  let result: { current: ReturnType<typeof useAcaanSettings> };

  beforeEach(() => {
    mockSetValueSucceeds = true;
    ({ result } = renderHook(() => useAcaanSettings()));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns timer settings from useAcaanTimer", () => {
    expect(result.current.timerSettings).toEqual({
      enabled: false,
      duration: 15,
    });
  });

  it("delegates setTimerDuration to useAcaanTimer", () => {
    act(() => {
      result.current.setTimerDuration(30);
    });
    expect(mockSetTimerDuration).toHaveBeenCalledWith(30);
  });

  describe("handleTimerEnabledChange", () => {
    it("tracks analytics and persists when enabling the timer", () => {
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
        "ACAAN"
      );
    });

    it("tracks analytics and persists when disabling the timer", () => {
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
        "ACAAN"
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
