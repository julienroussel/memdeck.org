import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DECK_SIZE } from "../../constants";
import { useCutDepthInput } from "./use-cut-depth-input";

// Cast intentional: only `key` and `preventDefault` are needed by the handler under test
const createKeyboardEvent = (key: string) =>
  ({ key, preventDefault: vi.fn() }) as unknown as React.KeyboardEvent;

describe("useCutDepthInput", () => {
  describe("initial state", () => {
    it("returns cutDepth as empty string", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      expect(result.current.cutDepth).toBe("");
    });

    it("returns maxCutDepth as DECK_SIZE - 1", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      expect(result.current.maxCutDepth).toBe(DECK_SIZE - 1);
    });
  });

  describe("handleCutDepthChange", () => {
    it("sets cutDepth to a numeric value when given a number", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(25);
      });

      expect(result.current.cutDepth).toBe(25);
    });

    it("sets cutDepth to a numeric value when given a numeric string", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange("10");
      });

      expect(result.current.cutDepth).toBe(10);
    });

    it("clears cutDepth to empty string when given an empty string", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(25);
      });

      act(() => {
        result.current.handleCutDepthChange("");
      });

      expect(result.current.cutDepth).toBe("");
    });

    it("sets cutDepth to 0 when given 0", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(0);
      });

      expect(result.current.cutDepth).toBe(0);
    });

    it("sets cutDepth to 0 when given the string '0'", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange("0");
      });

      expect(result.current.cutDepth).toBe(0);
    });

    it("sets cutDepth to NaN when given a non-numeric string", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange("abc");
      });

      expect(result.current.cutDepth).toBeNaN();
    });
  });

  describe("handleCheckAnswer", () => {
    it("calls submitAnswer with the current cutDepth when valid", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(15);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).toHaveBeenCalledWith(15);
    });

    it("resets cutDepth to empty string after submitting", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(15);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(result.current.cutDepth).toBe("");
    });

    it("does not call submitAnswer on second consecutive check after reset", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(15);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).toHaveBeenCalledTimes(1);
    });

    it("calls submitAnswer with 0 when cutDepth is 0", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(0);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).toHaveBeenCalledWith(0);
    });

    it("calls submitAnswer with DECK_SIZE - 1 when cutDepth is at max", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(DECK_SIZE - 1);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).toHaveBeenCalledWith(DECK_SIZE - 1);
    });

    it("does nothing when cutDepth is empty string", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).not.toHaveBeenCalled();
      expect(result.current.cutDepth).toBe("");
    });

    it("does not call submitAnswer for negative cutDepth", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(-1);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).not.toHaveBeenCalled();
      expect(result.current.cutDepth).toBe(-1);
    });

    it("does not call submitAnswer for cutDepth greater than max", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(DECK_SIZE);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).not.toHaveBeenCalled();
    });

    it("does not call submitAnswer for non-integer cutDepth", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(3.5);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).not.toHaveBeenCalled();
      expect(result.current.cutDepth).toBe(3.5);
    });

    it("does not call submitAnswer when cutDepth is NaN", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange("abc");
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(submitAnswer).not.toHaveBeenCalled();
      expect(result.current.cutDepth).toBeNaN();
    });

    it("does not reset cutDepth when validation fails", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(DECK_SIZE);
      });

      act(() => {
        result.current.handleCheckAnswer();
      });

      expect(result.current.cutDepth).toBe(DECK_SIZE);
    });
  });

  describe("handleKeyDown", () => {
    it("calls preventDefault and submitAnswer on Enter key when cutDepth is valid", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(20);
      });

      const event = createKeyboardEvent("Enter");

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(submitAnswer).toHaveBeenCalledWith(20);
    });

    it("resets cutDepth after Enter key triggers submission", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(20);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Enter"));
      });

      expect(result.current.cutDepth).toBe("");
    });

    it("does nothing on Enter key when cutDepth is empty", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      const event = createKeyboardEvent("Enter");

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(submitAnswer).not.toHaveBeenCalled();
    });

    it("does nothing on Enter key when cutDepth is invalid", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(DECK_SIZE);
      });

      const event = createKeyboardEvent("Enter");

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(submitAnswer).not.toHaveBeenCalled();
      expect(result.current.cutDepth).toBe(DECK_SIZE);
    });

    it("does nothing on non-Enter keys when cutDepth is set", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(20);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Escape"));
      });

      expect(submitAnswer).not.toHaveBeenCalled();
      expect(result.current.cutDepth).toBe(20);
    });

    it("does nothing on Tab key", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(10);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Tab"));
      });

      expect(submitAnswer).not.toHaveBeenCalled();
    });

    it("does nothing on Space key", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      act(() => {
        result.current.handleCutDepthChange(10);
      });

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent(" "));
      });

      expect(submitAnswer).not.toHaveBeenCalled();
    });

    it("does nothing on non-Enter key when cutDepth is empty", () => {
      const submitAnswer = vi.fn();
      const { result } = renderHook(() => useCutDepthInput(submitAnswer));

      const event = createKeyboardEvent("Escape");

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(submitAnswer).not.toHaveBeenCalled();
    });
  });
});
