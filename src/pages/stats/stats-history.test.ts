import { describe, expect, it } from "vitest";
import { formatDate, PAGE_SIZE } from "./stats-history";

describe("formatDate", () => {
  it("returns a non-empty string for a valid ISO date", () => {
    const result = formatDate("2025-06-15T14:30:00.000Z");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the abbreviated month or day for a known date", () => {
    const result = formatDate("2025-06-15T14:30:00.000Z");
    const containsMonthOrDay = result.includes("Jun") || result.includes("15");
    expect(containsMonthOrDay).toBe(true);
  });

  it("produces different output for different dates", () => {
    const resultA = formatDate("2025-06-15T14:30:00.000Z");
    const resultB = formatDate("2024-01-02T08:00:00.000Z");
    expect(resultA).not.toBe(resultB);
  });
});

describe("PAGE_SIZE", () => {
  it("equals 20", () => {
    expect(PAGE_SIZE).toBe(20);
  });
});
