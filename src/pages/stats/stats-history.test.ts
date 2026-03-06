import { describe, expect, it } from "vitest";
import { formatDate, PAGE_SIZE } from "./stats-history";

describe("formatDate", () => {
  it("formats an ISO date string with abbreviated month and day", () => {
    const result = formatDate("2025-06-15T14:30:00.000Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });

  it("formats a January date with abbreviated month and day", () => {
    const result = formatDate("2025-01-15T12:00:00.000Z");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("formats different dates with their respective month and day", () => {
    const resultA = formatDate("2025-06-15T14:30:00.000Z");
    const resultB = formatDate("2024-01-02T08:00:00.000Z");
    expect(resultA).toContain("Jun");
    expect(resultB).toContain("Jan");
  });
});

describe("PAGE_SIZE", () => {
  it("equals 20", () => {
    expect(PAGE_SIZE).toBe(20);
  });
});
