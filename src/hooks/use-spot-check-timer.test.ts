import { describe, expect, it, vi } from "vitest";
import { SPOT_CHECK_TIMER_LSK } from "../constants";

vi.mock("./use-timer-settings", () => ({
  useTimerSettings: vi.fn((key: string) => ({
    timerSettings: { enabled: false, duration: 15 },
    setTimerEnabled: vi.fn(),
    setTimerDuration: vi.fn(),
    storageKey: key,
  })),
}));

const { useTimerSettings } = await import("./use-timer-settings");
const { useSpotCheckTimer } = await import("./use-spot-check-timer");

describe("useSpotCheckTimer", () => {
  it("calls useTimerSettings with the Spot Check storage key", () => {
    useSpotCheckTimer();

    expect(useTimerSettings).toHaveBeenCalledWith(SPOT_CHECK_TIMER_LSK);
  });

  it("returns the result from useTimerSettings", () => {
    const result = useSpotCheckTimer();

    expect(result).toHaveProperty("timerSettings");
    expect(result).toHaveProperty("setTimerEnabled");
    expect(result).toHaveProperty("setTimerDuration");
  });
});
