import { describe, expect, it, vi } from "vitest";
import { FLASHCARD_TIMER_LSK } from "../constants";

vi.mock("./use-timer-settings", () => ({
  useTimerSettings: vi.fn((key: string) => ({
    timerSettings: { enabled: false, duration: 15 },
    setTimerEnabled: vi.fn(),
    setTimerDuration: vi.fn(),
    storageKey: key,
  })),
}));

const { useTimerSettings } = await import("./use-timer-settings");
const { useFlashcardTimer } = await import("./use-flashcard-timer");

describe("useFlashcardTimer", () => {
  it("calls useTimerSettings with the Flashcard storage key", () => {
    useFlashcardTimer();

    expect(useTimerSettings).toHaveBeenCalledWith(FLASHCARD_TIMER_LSK);
  });

  it("returns the result from useTimerSettings", () => {
    const result = useFlashcardTimer();

    expect(result).toHaveProperty("timerSettings");
    expect(result).toHaveProperty("setTimerEnabled");
    expect(result).toHaveProperty("setTimerDuration");
  });
});
