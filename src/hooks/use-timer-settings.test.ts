import { afterEach, describe, expect, it, vi } from "vitest";
import { FLASHCARD_TIMER_LSK } from "../constants";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";
import { isTimerSettings, useTimerSettings } from "./use-timer-settings";

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

describe("isTimerSettings", () => {
  it("rejects duration of 0", () => {
    expect(isTimerSettings({ enabled: true, duration: 0 })).toBe(false);
  });

  it("rejects duration of NaN", () => {
    expect(isTimerSettings({ enabled: true, duration: Number.NaN })).toBe(
      false
    );
  });

  it("rejects out-of-range duration", () => {
    expect(isTimerSettings({ enabled: true, duration: 99_999 })).toBe(false);
  });

  it("rejects negative duration", () => {
    expect(isTimerSettings({ enabled: true, duration: -10 })).toBe(false);
  });

  it("accepts duration of 10", () => {
    expect(isTimerSettings({ enabled: true, duration: 10 })).toBe(true);
  });

  it("accepts duration of 15", () => {
    expect(isTimerSettings({ enabled: true, duration: 15 })).toBe(true);
  });

  it("accepts duration of 30", () => {
    expect(isTimerSettings({ enabled: true, duration: 30 })).toBe(true);
  });

  it("rejects non-object values", () => {
    expect(isTimerSettings(null)).toBe(false);
    expect(isTimerSettings("hello")).toBe(false);
  });

  it("rejects objects missing required fields", () => {
    expect(isTimerSettings({ enabled: true })).toBe(false);
    expect(isTimerSettings({ duration: 10 })).toBe(false);
  });
});

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

    useTimerSettings(FLASHCARD_TIMER_LSK);

    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      FLASHCARD_TIMER_LSK,
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      })
    );
  });

  it("returns default timer settings", () => {
    mockedUseLocalDb.mockReturnValue([
      { enabled: false, duration: 15 },
      mockSetSettings,
      vi.fn(),
    ]);

    const { timerSettings } = useTimerSettings(FLASHCARD_TIMER_LSK);

    expect(timerSettings).toEqual({ enabled: false, duration: 15 });
  });

  it("returns existing timer settings", () => {
    mockedUseLocalDb.mockReturnValue([
      { enabled: true, duration: 30 },
      mockSetSettings,
      vi.fn(),
    ]);

    const { timerSettings } = useTimerSettings(FLASHCARD_TIMER_LSK);

    expect(timerSettings).toEqual({ enabled: true, duration: 30 });
  });

  describe("setTimerEnabled", () => {
    it("enables the timer", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: false, duration: 15 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerEnabled } = useTimerSettings(FLASHCARD_TIMER_LSK);
      setTimerEnabled(true);

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: false, duration: 15 });
      expect(result).toEqual({ enabled: true, duration: 15 });
    });

    it("runs the caller's onSuccess when the timer setting is persisted", () => {
      const setSettingsSucceeding = vi.fn(
        (_updater: unknown, opts?: { onSuccess?: () => void }) => {
          opts?.onSuccess?.();
        }
      );
      mockedUseLocalDb.mockReturnValue([
        { enabled: false, duration: 15 },
        setSettingsSucceeding,
        vi.fn(),
      ]);

      const { setTimerEnabled } = useTimerSettings(FLASHCARD_TIMER_LSK);
      const onSuccess = vi.fn();
      setTimerEnabled(true, { onSuccess });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("skips the caller's onSuccess when the persisted write is rejected", () => {
      // Mirrors useLocalDb's "failed write" path: the setter receives the
      // updater and options as usual but skips invoking onSuccess. A buggy
      // useTimerSettings that called onSuccess synchronously (instead of
      // forwarding it to the inner setter) would fail this test.
      // Receives the updater + options like the real setter, but never
      // invokes onSuccess (mirrors a Mantine-swallowed quota-exceeded write).
      const setSettingsRejecting = vi.fn();
      mockedUseLocalDb.mockReturnValue([
        { enabled: false, duration: 15 },
        setSettingsRejecting,
        vi.fn(),
      ]);

      const { setTimerEnabled } = useTimerSettings(FLASHCARD_TIMER_LSK);
      const onSuccess = vi.fn();
      setTimerEnabled(true, { onSuccess });

      expect(setSettingsRejecting).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("disables the timer", () => {
      mockedUseLocalDb.mockReturnValue([
        { enabled: true, duration: 15 },
        mockSetSettings,
        vi.fn(),
      ]);

      const { setTimerEnabled } = useTimerSettings(FLASHCARD_TIMER_LSK);
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

      const { setTimerEnabled } = useTimerSettings(FLASHCARD_TIMER_LSK);
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

      const { setTimerDuration } = useTimerSettings(FLASHCARD_TIMER_LSK);
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

      const { setTimerDuration } = useTimerSettings(FLASHCARD_TIMER_LSK);
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

      const { setTimerDuration } = useTimerSettings(FLASHCARD_TIMER_LSK);
      setTimerDuration(10);

      const updater = mockSetSettings.mock.calls[0][0];
      const result = updater({ enabled: false, duration: 15 });
      expect(result.enabled).toBe(false);
    });
  });
});
