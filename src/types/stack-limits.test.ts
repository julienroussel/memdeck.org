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
        end: createDeckPosition(10),
        start: createDeckPosition(1),
      })
    ).toBe(10);
  });

  it("returns 1 for single-card range", () => {
    expect(
      getRangeSize({
        end: createDeckPosition(5),
        start: createDeckPosition(5),
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
        end: createDeckPosition(20),
        start: createDeckPosition(1),
      })
    ).toBe(false);
  });

  it("returns false when start is not 1", () => {
    expect(
      isFullDeck({
        end: createDeckPosition(52),
        start: createDeckPosition(2),
      })
    ).toBe(false);
  });
});

describe("isStackLimitsRecord", () => {
  it("returns true for empty object", () => {
    expect(isStackLimitsRecord({})).toBe(true);
  });

  it("returns true for valid record", () => {
    expect(isStackLimitsRecord({ mnemonica: { end: 20, start: 1 } })).toBe(
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
    expect(isStackLimitsRecord({ mnemonica: { end: 20, start: 0 } })).toBe(
      false
    );
  });

  it("returns false when start > end", () => {
    expect(isStackLimitsRecord({ mnemonica: { end: 10, start: 30 } })).toBe(
      false
    );
  });

  it("returns false for out-of-range values", () => {
    expect(isStackLimitsRecord({ mnemonica: { end: 53, start: 1 } })).toBe(
      false
    );
  });

  it("returns false for non-integer values", () => {
    expect(isStackLimitsRecord({ mnemonica: { end: 20, start: 1.5 } })).toBe(
      false
    );
  });

  it("returns false for an unknown stack key", () => {
    expect(isStackLimitsRecord({ unknownStack: { end: 20, start: 1 } })).toBe(
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
