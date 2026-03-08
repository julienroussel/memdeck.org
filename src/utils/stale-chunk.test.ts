import { describe, expect, it } from "vitest";
import { isStaleChunkError } from "./stale-chunk";

describe("isStaleChunkError", () => {
  it.each([
    [
      "Chrome/Edge",
      "Failed to fetch dynamically imported module: /assets/foo.js",
    ],
    ["Firefox", "error loading dynamically imported module: /assets/foo.js"],
    ["Safari", "Importing a module script failed."],
  ])("returns true for %s stale chunk TypeError", (_browser, message) => {
    expect(isStaleChunkError(new TypeError(message))).toBe(true);
  });

  it("returns false for a plain Error with a matching message", () => {
    expect(
      isStaleChunkError(
        new Error("Failed to fetch dynamically imported module: /assets/foo.js")
      )
    ).toBe(false);
  });

  it("returns false for a TypeError with a non-matching message", () => {
    expect(isStaleChunkError(new TypeError("Network error"))).toBe(false);
  });

  it("returns false for a non-Error value", () => {
    expect(
      isStaleChunkError("Failed to fetch dynamically imported module")
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(isStaleChunkError(null)).toBe(false);
  });
});
