import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpreadOffset } from "./use-spread-offset";

// 6 items: maxOffset = 3, which equals one keyboard step.
const ITEM_COUNT = 6;

const frames: FrameRequestCallback[] = [];
const cancelFrame = vi.fn();

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
});

afterEach(() => {
  vi.unstubAllGlobals();
  frames.length = 0;
  cancelFrame.mockClear();
});

const flushFrames = () => {
  act(() => {
    for (const cb of frames.splice(0)) {
      cb(0);
    }
  });
};

const renderOffset = (canMove = true, itemCount = ITEM_COUNT) =>
  renderHook(() => useSpreadOffset({ canMove, itemCount }));

type Result = ReturnType<typeof renderOffset>["result"];

const drag = (result: Result, movementX: number, buttons = 1) => {
  act(() =>
    result.current.handleMouseMove({ buttons, nativeEvent: { movementX } })
  );
};

const touchEvent = (screenXs: number[]) => ({
  nativeEvent: { touches: screenXs.map((screenX) => ({ screenX })) },
  touches: { length: screenXs.length },
});

const touchStart = (result: Result, screenXs: number[]) => {
  act(() => result.current.handleTouchStart(touchEvent(screenXs)));
};

const touchMove = (result: Result, screenXs: number[]) => {
  act(() => result.current.handleTouchMove(touchEvent(screenXs)));
};

const pressKey = (result: Result, key: string) => {
  const preventDefault = vi.fn();
  act(() => result.current.handleKeyDown({ key, preventDefault }));
  return preventDefault;
};

const focusItem = (
  result: Result,
  dataset: Record<string, string>,
  focusVisible = true
) => {
  const target = document.createElement("button");
  Object.assign(target.dataset, dataset);
  vi.spyOn(target, "matches").mockReturnValue(focusVisible);
  act(() => result.current.handleFocus({ target }));
};

describe("useSpreadOffset", () => {
  it("starts at offset 0", () => {
    const { result } = renderOffset();
    expect(result.current.offset).toBe(0);
  });

  describe("mouse drag", () => {
    it("moves one step in the direction of the drag per animation frame", () => {
      const { result } = renderOffset();

      drag(result, -4);
      flushFrames();
      expect(result.current.offset).toBe(-1);

      drag(result, 4);
      flushFrames();
      expect(result.current.offset).toBe(0);
    });

    it("batches moves within one frame into a single step by their net direction", () => {
      const { result } = renderOffset();

      drag(result, 4);
      drag(result, 4);
      drag(result, -10);
      expect(frames).toHaveLength(1);
      flushFrames();
      expect(result.current.offset).toBe(-1);
    });

    it("clamps at plus and minus itemCount / 2", () => {
      const { result } = renderOffset();

      for (const movementX of [4, 4, 4, 4, 4]) {
        drag(result, movementX);
        flushFrames();
      }
      expect(result.current.offset).toBe(3);

      for (const movementX of [-4, -4, -4, -4, -4, -4, -4, -4]) {
        drag(result, movementX);
        flushFrames();
      }
      expect(result.current.offset).toBe(-3);
    });

    it("ignores moves without the primary button held", () => {
      const { result } = renderOffset();

      drag(result, -4, 0);
      flushFrames();
      expect(result.current.offset).toBe(0);
    });

    it("ignores moves when canMove is false", () => {
      const { result } = renderOffset(false);

      drag(result, -4);
      flushFrames();
      expect(frames).toHaveLength(0);
      expect(result.current.offset).toBe(0);
    });
  });

  describe("touch drag", () => {
    it("measures the first move from the touch-start position", () => {
      const { result } = renderOffset();

      touchStart(result, [300]);
      touchMove(result, [290]);
      flushFrames();
      expect(result.current.offset).toBe(-1);
    });

    it("resets the reference point on each touch start", () => {
      const { result } = renderOffset();

      touchStart(result, [300]);
      touchMove(result, [290]);
      flushFrames();

      // Without the reset this move would read as 60 - 290 (leftwards).
      touchStart(result, [50]);
      touchMove(result, [60]);
      flushFrames();
      expect(result.current.offset).toBe(0);
    });

    it("keeps the previous reference point when touch start has no touches", () => {
      const { result } = renderOffset();

      touchStart(result, [100]);
      touchStart(result, []);
      touchMove(result, [90]);
      flushFrames();
      expect(result.current.offset).toBe(-1);
    });

    it("clamps at plus and minus itemCount / 2", () => {
      const { result } = renderOffset();

      touchStart(result, [100]);
      for (const x of [110, 120, 130, 140, 150]) {
        touchMove(result, [x]);
        flushFrames();
      }
      expect(result.current.offset).toBe(3);
    });

    it("ignores multi-touch moves and moves when canMove is false", () => {
      const multi = renderOffset();
      touchStart(multi.result, [100]);
      touchMove(multi.result, [90, 200]);
      flushFrames();
      expect(multi.result.current.offset).toBe(0);

      const locked = renderOffset(false);
      touchStart(locked.result, [100]);
      touchMove(locked.result, [90]);
      flushFrames();
      expect(locked.result.current.offset).toBe(0);
    });
  });

  describe("keyboard panning", () => {
    it("pans by three per arrow press and prevents the default scroll", () => {
      const { result } = renderOffset(true, 52);

      expect(pressKey(result, "ArrowRight")).toHaveBeenCalledOnce();
      expect(result.current.offset).toBe(3);

      expect(pressKey(result, "ArrowLeft")).toHaveBeenCalledOnce();
      pressKey(result, "ArrowLeft");
      expect(result.current.offset).toBe(-3);
    });

    it("clamps at plus and minus itemCount / 2", () => {
      const { result } = renderOffset(true, 4);

      pressKey(result, "ArrowRight");
      expect(result.current.offset).toBe(2);

      pressKey(result, "ArrowLeft");
      pressKey(result, "ArrowLeft");
      expect(result.current.offset).toBe(-2);
    });

    it("ignores other keys without preventing their default", () => {
      const { result } = renderOffset();

      for (const key of ["Enter", "Escape", "Tab"]) {
        expect(pressKey(result, key)).not.toHaveBeenCalled();
      }
      expect(result.current.offset).toBe(0);
    });

    it("ignores arrows when canMove is false", () => {
      const { result } = renderOffset(false);

      expect(pressKey(result, "ArrowRight")).not.toHaveBeenCalled();
      expect(result.current.offset).toBe(0);
    });
  });

  describe("focus centring", () => {
    it("sets the offset to minus the focused item's --i", () => {
      const { result } = renderOffset(true, 52);

      // index 0 of 52: --i = 0 + 1 - 26 = -25.
      focusItem(result, { numberIndex: "0" });
      expect(result.current.offset).toBe(25);

      focusItem(result, { cardIndex: "51" });
      expect(result.current.offset).toBe(-26);
    });

    it("does not pan when focus is not keyboard-visible", () => {
      const { result } = renderOffset(true, 52);

      focusItem(result, { cardIndex: "0" }, false);
      expect(result.current.offset).toBe(0);
    });

    it("does not pan when the focused element carries no item index", () => {
      const { result } = renderOffset(true, 52);

      focusItem(result, {});
      expect(result.current.offset).toBe(0);
    });

    it("does not pan when canMove is false", () => {
      const { result } = renderOffset(false, 52);

      focusItem(result, { cardIndex: "0" });
      expect(result.current.offset).toBe(0);
    });
  });

  it("cancels a pending animation frame on unmount", () => {
    const { result, unmount } = renderOffset();

    drag(result, 4);
    unmount();
    expect(cancelFrame).toHaveBeenCalledWith(1);
  });
});
