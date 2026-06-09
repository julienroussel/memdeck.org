import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_CARDS } from "../types/playingcard";
import { useCardImagePreload } from "./use-card-image-preload";

// Instances created by the hook's `new Image()` calls, in creation order.
let createdImages: FakeImage[] = [];

class FakeImage {
  src = "";
  constructor() {
    createdImages.push(this);
  }
}

let capturedIdleCallback: (() => void) | null = null;

const requestIdleCallbackMock = vi.fn((callback: () => void): number => {
  capturedIdleCallback = callback;
  return 42;
});

const cancelIdleCallbackMock = vi.fn();

const stubIdleCallbacks = (): void => {
  vi.stubGlobal("requestIdleCallback", requestIdleCallbackMock);
  vi.stubGlobal("cancelIdleCallback", cancelIdleCallbackMock);
};

// Drive the hook's setTimeout fallback branch. `stubGlobal` first so
// `unstubAllGlobals` restores any native happy-dom implementation, then
// delete the property so the hook's `"requestIdleCallback" in window`
// check is false (a stubbed `undefined` value would still pass `in`).
const removeRequestIdleCallback = (): void => {
  vi.stubGlobal("requestIdleCallback", undefined);
  Reflect.deleteProperty(window, "requestIdleCallback");
};

afterEach(() => {
  // Unmount before unstubbing so the hook's effect cleanup still sees the
  // stubbed cancelIdleCallback/clearTimeout globals it captured.
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
  createdImages = [];
  capturedIdleCallback = null;
});

describe("useCardImagePreload", () => {
  it("preloads all 52 card images when the idle callback runs", () => {
    stubIdleCallbacks();
    vi.stubGlobal("Image", FakeImage);

    renderHook(() => useCardImagePreload());

    expect(requestIdleCallbackMock).toHaveBeenCalledTimes(1);
    // Nothing is fetched until the browser grants idle time.
    expect(createdImages).toHaveLength(0);

    capturedIdleCallback?.();

    expect(createdImages).toHaveLength(52);
    expect(createdImages.map((img) => img.src)).toEqual(
      ALL_CARDS.map((card) => card.image)
    );
  });

  it("falls back to setTimeout when requestIdleCallback is unavailable", () => {
    removeRequestIdleCallback();
    vi.stubGlobal("Image", FakeImage);
    vi.useFakeTimers();

    renderHook(() => useCardImagePreload());

    expect(createdImages).toHaveLength(0);

    vi.advanceTimersByTime(1);

    expect(createdImages).toHaveLength(52);
    expect(createdImages.map((img) => img.src)).toEqual(
      ALL_CARDS.map((card) => card.image)
    );
  });

  it("cancels the pending idle callback on unmount before preload runs", () => {
    stubIdleCallbacks();
    vi.stubGlobal("Image", FakeImage);

    const { unmount } = renderHook(() => useCardImagePreload());
    unmount();

    expect(cancelIdleCallbackMock).toHaveBeenCalledWith(42);
    expect(createdImages).toHaveLength(0);
  });

  it("clears the pending timeout on unmount before preload runs", () => {
    removeRequestIdleCallback();
    vi.stubGlobal("Image", FakeImage);
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useCardImagePreload());
    unmount();

    vi.advanceTimersByTime(10);

    expect(createdImages).toHaveLength(0);
  });
});
