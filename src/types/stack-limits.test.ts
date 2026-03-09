import { describe, expect, it } from "vitest";
import {
  DEFAULT_STACK_LIMITS,
  getRangeSize,
  isFullDeck,
  isStackLimitsRecord,
} from "./stack-limits";
import { createDeckPosition } from "./stacks";

describe("getRangeSize", () => {
  it("returns 52 for full deck", () => {
    expect(getRangeSize(DEFAULT_STACK_LIMITS)).toBe(52);
  });

  it("returns correct size for partial range", () => {
    expect(
      getRangeSize({
        start: createDeckPosition(1),
        end: createDeckPosition(10),
      })
    ).toBe(10);
  });

  it("returns 1 for single-card range", () => {
    expect(
      getRangeSize({
        start: createDeckPosition(5),
        end: createDeckPosition(5),
      })
    ).toBe(1);
  });
});

describe("isFullDeck", () => {
  it("returns true for default limits", () => {
    expect(isFullDeck(DEFAULT_STACK_LIMITS)).toBe(true);
  });

  it("returns false for partial range", () => {
    expect(
      isFullDeck({
        start: createDeckPosition(1),
        end: createDeckPosition(20),
      })
    ).toBe(false);
  });

  it("returns false when start is not 1", () => {
    expect(
      isFullDeck({
        start: createDeckPosition(2),
        end: createDeckPosition(52),
      })
    ).toBe(false);
  });
});

describe("isStackLimitsRecord", () => {
  it("returns true for empty object", () => {
    expect(isStackLimitsRecord({})).toBe(true);
  });

  it("returns true for valid record", () => {
    expect(isStackLimitsRecord({ mnemonica: { start: 1, end: 20 } })).toBe(
      true
    );
  });

  it("returns false for null", () => {
    expect(isStackLimitsRecord(null)).toBe(false);
  });

  it("returns false for array", () => {
    expect(isStackLimitsRecord([])).toBe(false);
  });

  it("returns false for invalid entry", () => {
    expect(isStackLimitsRecord({ mnemonica: { start: 0, end: 20 } })).toBe(
      false
    );
  });

  it("returns false when start > end", () => {
    expect(isStackLimitsRecord({ mnemonica: { start: 30, end: 10 } })).toBe(
      false
    );
  });

  it("returns false for out-of-range values", () => {
    expect(isStackLimitsRecord({ mnemonica: { start: 1, end: 53 } })).toBe(
      false
    );
  });

  it("returns false for non-integer values", () => {
    expect(isStackLimitsRecord({ mnemonica: { start: 1.5, end: 20 } })).toBe(
      false
    );
  });

  it("returns false for an unknown stack key", () => {
    expect(isStackLimitsRecord({ unknownStack: { start: 1, end: 20 } })).toBe(
      false
    );
  });

  it("returns false when entry is a primitive", () => {
    expect(isStackLimitsRecord({ mnemonica: "string" })).toBe(false);
  });

  it("returns false when entry is missing end field", () => {
    expect(isStackLimitsRecord({ mnemonica: { start: 1 } })).toBe(false);
  });

  it("returns false when entry is missing start field", () => {
    expect(isStackLimitsRecord({ mnemonica: { end: 20 } })).toBe(false);
  });
});
