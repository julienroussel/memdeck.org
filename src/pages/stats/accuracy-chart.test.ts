import { describe, expect, it } from "vitest";
import { getAccuracyColor, isFilter } from "./accuracy-chart";

describe("getAccuracyColor", () => {
  it("returns 'green' for percent >= 80", () => {
    expect(getAccuracyColor(80)).toBe("green");
    expect(getAccuracyColor(90)).toBe("green");
    expect(getAccuracyColor(100)).toBe("green");
  });

  it("returns 'yellow' for percent >= 50 and < 80", () => {
    expect(getAccuracyColor(50)).toBe("yellow");
    expect(getAccuracyColor(60)).toBe("yellow");
    expect(getAccuracyColor(79)).toBe("yellow");
  });

  it("returns 'red' for percent < 50", () => {
    expect(getAccuracyColor(0)).toBe("red");
    expect(getAccuracyColor(30)).toBe("red");
    expect(getAccuracyColor(49)).toBe("red");
  });
});

describe("isFilter", () => {
  it("returns true for valid filter values", () => {
    expect(isFilter("all")).toBe(true);
    expect(isFilter("flashcard")).toBe(true);
    expect(isFilter("acaan")).toBe(true);
  });

  it("returns false for invalid filter values", () => {
    expect(isFilter("invalid")).toBe(false);
    expect(isFilter("")).toBe(false);
    expect(isFilter("FLASHCARD")).toBe(false);
  });
});
