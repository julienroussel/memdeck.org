import { describe, expect, it } from "vitest";
import { type DisplayMode, getRandomDisplayMode } from "./utils";

describe("getRandomDisplayMode", () => {
  it("returns a valid display mode", () => {
    const mode = getRandomDisplayMode();
    expect(["card", "index"]).toContain(mode);
  });

  it("returns both modes across many calls", () => {
    const results = new Set<DisplayMode>();
    for (let i = 0; i < 100; i += 1) {
      results.add(getRandomDisplayMode());
    }
    expect(results.has("card")).toBe(true);
    expect(results.has("index")).toBe(true);
  });
});
