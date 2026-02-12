import { describe, expect, it } from "vitest";
import { includes } from "./includes";

const FRUITS = ["apple", "banana", "cherry"] as const;
const NUMBERS = [10, 20, 30] as const;

describe("includes", () => {
  it("returns true when the value is in the array", () => {
    expect(includes(FRUITS, "apple")).toBe(true);
    expect(includes(FRUITS, "banana")).toBe(true);
    expect(includes(FRUITS, "cherry")).toBe(true);
  });

  it("returns false when the value is not in the array", () => {
    expect(includes(FRUITS, "dragonfruit")).toBe(false);
    expect(includes(FRUITS, "")).toBe(false);
  });

  it("returns false for values of a different type", () => {
    expect(includes(FRUITS, 42)).toBe(false);
    expect(includes(FRUITS, null)).toBe(false);
    expect(includes(FRUITS, undefined)).toBe(false);
  });

  it("works with numeric const arrays", () => {
    expect(includes(NUMBERS, 10)).toBe(true);
    expect(includes(NUMBERS, 20)).toBe(true);
    expect(includes(NUMBERS, 99)).toBe(false);
  });

  it("narrows the type after a truthy check", () => {
    const value: unknown = "banana";
    if (includes(FRUITS, value)) {
      // At this point, value is narrowed to "apple" | "banana" | "cherry".
      // We verify the narrowing works at runtime by assigning to the union type.
      const narrowed: (typeof FRUITS)[number] = value;
      expect(narrowed).toBe("banana");
    } else {
      // This branch should not execute for "banana"
      expect.unreachable("Expected value to be included in FRUITS");
    }
  });

  it("does not narrow the type after a falsy check", () => {
    const value: unknown = "dragonfruit";
    if (includes(FRUITS, value)) {
      expect.unreachable("Expected value to NOT be included in FRUITS");
    } else {
      // value remains `unknown` here — no narrowing occurred
      expect(value).toBe("dragonfruit");
    }
  });

  it("works with an empty array", () => {
    const empty = [] as const;
    expect(includes(empty, "anything")).toBe(false);
  });
});
