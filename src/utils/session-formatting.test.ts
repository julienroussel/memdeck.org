import { describe, expect, it } from "vitest";
import {
  calculateAccuracy,
  formatDuration,
  toAccuracyPercent,
} from "./session-formatting";

describe("toAccuracyPercent", () => {
  it("converts 0 to 0", () => {
    expect(toAccuracyPercent(0)).toBe(0);
  });

  it("converts 1 to 100", () => {
    expect(toAccuracyPercent(1)).toBe(100);
  });

  it("converts 0.8 to 80", () => {
    expect(toAccuracyPercent(0.8)).toBe(80);
  });

  it("rounds to the nearest integer", () => {
    expect(toAccuracyPercent(0.755)).toBe(76);
    expect(toAccuracyPercent(0.754)).toBe(75);
  });

  it("handles very small decimals", () => {
    expect(toAccuracyPercent(0.001)).toBe(0);
    expect(toAccuracyPercent(0.005)).toBe(1);
  });
});

describe("formatDuration", () => {
  it("returns '0s' for 0 seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("returns seconds only when under a minute", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("returns minutes and zero seconds for exact minutes", () => {
    expect(formatDuration(120)).toBe("2m 0s");
  });

  it("returns minutes and seconds for mixed durations", () => {
    expect(formatDuration(150)).toBe("2m 30s");
  });

  it("rounds fractional seconds", () => {
    expect(formatDuration(150.7)).toBe("2m 31s");
  });

  it("normalizes 59.5 seconds to 1m 0s", () => {
    expect(formatDuration(59.5)).toBe("1m 0s");
  });
});

describe("calculateAccuracy", () => {
  it("returns 0 when no attempts", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it("returns 1 for all successes", () => {
    expect(calculateAccuracy(10, 0)).toBe(1);
  });

  it("returns 0 for all fails", () => {
    expect(calculateAccuracy(0, 10)).toBe(0);
  });

  it("calculates correct ratio", () => {
    expect(calculateAccuracy(3, 1)).toBe(0.75);
  });
});
