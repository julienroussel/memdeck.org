import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSplashRemoval } from "./use-splash-removal";

describe("useSplashRemoval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("does not throw when #splash element does not exist", () => {
    expect(() => renderHook(() => useSplashRemoval())).not.toThrow();
  });

  it("adds the splash-hidden class to the splash element", () => {
    const splash = document.createElement("div");
    splash.id = "splash";
    document.body.appendChild(splash);

    renderHook(() => useSplashRemoval());

    expect(splash.classList.contains("splash-hidden")).toBe(true);
  });

  it("removes the splash element when transitionend fires", () => {
    const splash = document.createElement("div");
    splash.id = "splash";
    document.body.appendChild(splash);

    renderHook(() => useSplashRemoval());

    splash.dispatchEvent(new Event("transitionend"));

    expect(document.getElementById("splash")).toBeNull();
  });

  it("removes the splash element via fallback timeout when transition does not fire", () => {
    const splash = document.createElement("div");
    splash.id = "splash";
    document.body.appendChild(splash);

    renderHook(() => useSplashRemoval());

    vi.advanceTimersByTime(500);

    expect(document.getElementById("splash")).toBeNull();
  });

  it("clears the fallback timeout on cleanup", () => {
    const splash = document.createElement("div");
    splash.id = "splash";
    document.body.appendChild(splash);

    const { unmount } = renderHook(() => useSplashRemoval());

    unmount();

    vi.advanceTimersByTime(500);

    expect(document.getElementById("splash")).not.toBeNull();
  });

  it("removes the transitionend listener on cleanup", () => {
    const splash = document.createElement("div");
    splash.id = "splash";
    document.body.appendChild(splash);

    const { unmount } = renderHook(() => useSplashRemoval());

    unmount();

    splash.dispatchEvent(new Event("transitionend"));

    expect(document.getElementById("splash")).not.toBeNull();
  });
});
