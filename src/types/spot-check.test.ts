import { describe, expect, it } from "vitest";
import { isSpotCheckMode } from "./spot-check";

describe("isSpotCheckMode", () => {
  it("returns true for 'missing'", () => {
    expect(isSpotCheckMode("missing")).toBe(true);
  });

  it("returns true for 'swapped'", () => {
    expect(isSpotCheckMode("swapped")).toBe(true);
  });

  it("returns true for 'moved'", () => {
    expect(isSpotCheckMode("moved")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isSpotCheckMode("invalid")).toBe(false);
    expect(isSpotCheckMode("other")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSpotCheckMode("")).toBe(false);
  });

  it("returns false for capitalized variants", () => {
    expect(isSpotCheckMode("Missing")).toBe(false);
    expect(isSpotCheckMode("Swapped")).toBe(false);
    expect(isSpotCheckMode("Moved")).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isSpotCheckMode(42)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isSpotCheckMode(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isSpotCheckMode(undefined)).toBe(false);
  });
});
