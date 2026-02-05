import { afterEach, describe, expect, it, vi } from "vitest";
import { useTimerSettings } from "./use-timer-settings";

const mockSetSettings = vi.fn();

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
  };
});

vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn((_, defaultValue) => [
    defaultValue,
    mockSetSettings,
    vi.fn(),
  ]),
}));

const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);

describe("useTimerSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the provided localStorage key", () => {
    mockedUseLocalDb.mockReturnValue([
      { enabled: false, duration: 15 },
      mockSetSettings,
      vi.fn(),
    ]);

    useTimerSettings("test-timer-key");

    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      "test-timer-key",
      expect.any(Object)
    );
  });

  it("returns default timer settings", () => {
    mockedUseLocalDb.mockReturnValue([
      { enabled: false, duration: 15 },
      mockSetSettings,
      vi.fn(),
    ]);

    const { timerSettings } = useTimerSettings("test-key");

    expect(timerSettings).toEqual({ enabled: false, duration: 15 });
  });

  it("returns existing timer settings", () => {
    mockedUseLocalDb.mockReturnValue([
      { enabled: true, duration: 30 },
      mockSetSettings,
      vi.fn(),
    ]);

    const { timerSettings } = useTimerSettings("test-key");

    expect(timerSettings).toEqual({ enabled: true, duration: 30 });
  });

  describe("setTimerEnabled", () => {
    it("enables the timer", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: false, duration: 15 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerEnabled } = useTimerSettings("test-key");
      setTimerEnabled(true);

      expect(mockSetSettings).toHaveBeenCalledWith(expect.any(Function));

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: false, duration: 15 });
      expect(result).toEqual({ enabled: true, duration: 15 });
    });

    it("disables the timer", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: true, duration: 15 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerEnabled } = useTimerSettings("test-key");
      setTimerEnabled(false);

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: true, duration: 15 });
      expect(result).toEqual({ enabled: false, duration: 15 });
    });

    it("preserves duration when toggling enabled", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: false, duration: 30 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerEnabled } = useTimerSettings("test-key");
      setTimerEnabled(true);

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: false, duration: 30 });
      expect(result.duration).toBe(30);
    });
  });

  describe("setTimerDuration", () => {
    it("updates the timer duration to 10 seconds", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: true, duration: 15 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerDuration } = useTimerSettings("test-key");
      setTimerDuration(10);

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: true, duration: 15 });
      expect(result).toEqual({ enabled: true, duration: 10 });
    });

    it("updates the timer duration to 30 seconds", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: true, duration: 15 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerDuration } = useTimerSettings("test-key");
      setTimerDuration(30);

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: true, duration: 15 });
      expect(result).toEqual({ enabled: true, duration: 30 });
    });

    it("preserves enabled state when changing duration", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: false, duration: 15 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerDuration } = useTimerSettings("test-key");
      setTimerDuration(10);

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: false, duration: 15 });
      expect(result.enabled).toBe(false);
    });
  });
});
