import { describe, expect, it } from "vitest";
import { DEFAULT_STACK_LIMITS } from "../../types/stack-limits";
import { createDeckPosition } from "../../types/stacks";
import type { FlashcardPool } from "./flashcard-pool";
import { getPoolSize, isSamePool } from "./flashcard-pool";

const focus = (...positions: number[]): FlashcardPool => ({
  kind: "focus",
  positions: positions.map(createDeckPosition),
});
const range = (start: number, end: number): FlashcardPool => ({
  kind: "range",
  limits: { end: createDeckPosition(end), start: createDeckPosition(start) },
});

describe("getPoolSize", () => {
  it("counts the focus list's positions", () => {
    expect(getPoolSize(focus(23, 24, 28, 29, 30, 31, 42))).toBe(7);
  });

  it("counts the range's positions", () => {
    expect(getPoolSize(range(5, 21))).toBe(17);
    expect(getPoolSize({ kind: "range", limits: DEFAULT_STACK_LIMITS })).toBe(
      52
    );
  });
});

describe("isSamePool", () => {
  it("compares ranges and lists by content", () => {
    expect(isSamePool(range(1, 20), range(1, 20))).toBe(true);
    expect(isSamePool(range(1, 20), range(1, 21))).toBe(false);
    expect(isSamePool(focus(1, 2, 3, 4, 5), focus(1, 2, 3, 4, 5))).toBe(true);
    expect(isSamePool(focus(1, 2, 3, 4, 5), focus(1, 2, 3, 4, 6))).toBe(false);
    expect(isSamePool(focus(1, 2, 3, 4, 5), focus(1, 2, 3, 4))).toBe(false);
  });

  it("never matches a range with a list", () => {
    expect(isSamePool(range(1, 5), focus(1, 2, 3, 4, 5))).toBe(false);
  });
});
