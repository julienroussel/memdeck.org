import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPwa } from "./is-pwa";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("isPwa", () => {
  it("returns false when not in standalone mode", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);
    expect(isPwa()).toBe(false);
  });

  it("returns true when display-mode is standalone", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    expect(isPwa()).toBe(true);
  });

  it("returns true when navigator.standalone is true (iOS)", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);
    Object.defineProperty(navigator, "standalone", {
      value: true,
      configurable: true,
    });
    expect(isPwa()).toBe(true);
    Object.defineProperty(navigator, "standalone", {
      value: undefined,
      configurable: true,
    });
  });
});
