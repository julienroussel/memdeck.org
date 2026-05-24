import { describe, expect, it } from "vitest";
import { PWA_SHORTCUTS, ROUTES } from "./constants";

describe("PWA manifest shortcuts", () => {
  it("contains at least one shortcut", () => {
    expect(PWA_SHORTCUTS.length).toBeGreaterThan(0);
  });

  it("every shortcut URL matches a value in ROUTES", () => {
    const routeValues = new Set<string>(Object.values(ROUTES));

    for (const shortcut of PWA_SHORTCUTS) {
      expect(routeValues.has(shortcut.url)).toBe(true);
    }
  });

  it("has no duplicate URLs", () => {
    const urls = PWA_SHORTCUTS.map((shortcut) => shortcut.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
