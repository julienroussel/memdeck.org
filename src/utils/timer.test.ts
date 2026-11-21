import { describe, expect, it } from "vitest";
import { VALID_DURATIONS } from "../types/timer";
import {
  calculateTimerProgress,
  getTimerColor,
  isValidDuration,
  TIMER_DURATION_OPTIONS,
} from "./timer";

describe("calculateTimerProgress", () => {
  it("returns 100 when timer is full", () => {
    expect(calculateTimerProgress(30, 30)).toBe(100);
  });

  it("returns 50 when half the time remains", () => {
    expect(calculateTimerProgress(15, 30)).toBe(50);
  });

  it("returns 0 when time has run out", () => {
    expect(calculateTimerProgress(0, 30)).toBe(0);
  });

  it("returns 0 when timerDuration is 0 (prevents division by zero)", () => {
    expect(calculateTimerProgress(10, 0)).toBe(0);
  });

  it("calculates correct percentage for various values", () => {
    expect(calculateTimerProgress(3, 10)).toBe(30);
    expect(calculateTimerProgress(7, 10)).toBe(70);
    expect(calculateTimerProgress(1, 15)).toBeCloseTo(6.67, 1);
  });
});

describe("getTimerColor", () => {
  it("returns red when time is 0 seconds", () => {
    expect(getTimerColor(0, 30)).toBe("red");
  });

  it("returns red when time is 1 second", () => {
    expect(getTimerColor(1, 30)).toBe("red");
  });

  it("returns red when time is 2 seconds", () => {
    expect(getTimerColor(2, 30)).toBe("red");
  });

  it("returns red when time is 3 seconds", () => {
    expect(getTimerColor(3, 30)).toBe("red");
  });

  it("returns yellow when time is 4 seconds", () => {
    expect(getTimerColor(4, 30)).toBe("yellow");
  });

  it("returns yellow when time is 5 seconds", () => {
    expect(getTimerColor(5, 30)).toBe("yellow");
  });

  it("returns blue when time is 6 seconds", () => {
    expect(getTimerColor(6, 30)).toBe("blue");
  });

  it("returns blue when time is 10 seconds", () => {
    expect(getTimerColor(10, 30)).toBe("blue");
  });

  it("returns blue when time is 30 seconds", () => {
    expect(getTimerColor(30, 30)).toBe("blue");
  });
});

describe("getTimerColor at the start of a short timer", () => {
  it("returns blue while the full 5-second duration remains", () => {
    expect(getTimerColor(5, 5)).toBe("blue");
  });

  it("returns red when a zero-length timer has no time left", () => {
    expect(getTimerColor(0, 0)).toBe("red");
  });

  it("returns yellow once a 5-second timer starts counting down", () => {
    expect(getTimerColor(4, 5)).toBe("yellow");
  });
});

describe("VALID_DURATIONS", () => {
  it("contains exactly 5, 10, 15, and 30", () => {
    expect(VALID_DURATIONS).toEqual([5, 10, 15, 30]);
  });
});

describe("TIMER_DURATION_OPTIONS", () => {
  it("has correctly formatted options for SegmentedControl", () => {
    expect(TIMER_DURATION_OPTIONS).toEqual([
      { label: "5s", value: "5" },
      { label: "10s", value: "10" },
      { label: "15s", value: "15" },
      { label: "30s", value: "30" },
    ]);
  });
});

describe("isValidDuration", () => {
  it("returns true for 10", () => {
    expect(isValidDuration(10)).toBe(true);
  });

  it("returns true for 15", () => {
    expect(isValidDuration(15)).toBe(true);
  });

  it("returns true for 30", () => {
    expect(isValidDuration(30)).toBe(true);
  });

  it("returns true for 5", () => {
    expect(isValidDuration(5)).toBe(true);
  });

  it("returns false for 7", () => {
    expect(isValidDuration(7)).toBe(false);
  });

  it("returns false for 20", () => {
    expect(isValidDuration(20)).toBe(false);
  });

  it("returns false for 0", () => {
    expect(isValidDuration(0)).toBe(false);
  });

  it("returns false for negative numbers", () => {
    expect(isValidDuration(-10)).toBe(false);
  });
});
