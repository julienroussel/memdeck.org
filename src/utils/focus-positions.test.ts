import { describe, expect, it } from "vitest";
import { createDeckPosition } from "../types/stacks";
import {
  formatFocusPositions,
  isFocusPositionList,
  isRecordedFocusPositions,
  isSamePositions,
  parseFocusPositions,
} from "./focus-positions";

describe("parseFocusPositions", () => {
  it("expands positions and ranges into sorted positions", () => {
    expect(parseFocusPositions("42,23,28-31,24")).toEqual({
      ok: true,
      positions: [23, 24, 28, 29, 30, 31, 42],
    });
  });

  it("accepts spaces around tokens and around a range's hyphen", () => {
    expect(parseFocusPositions(" 1 , 2,3 - 5 ")).toEqual({
      ok: true,
      positions: [1, 2, 3, 4, 5],
    });
  });

  it("accepts an en or em dash as the range hyphen", () => {
    expect(parseFocusPositions("1\u20133, 4 \u2014 5")).toEqual({
      ok: true,
      positions: [1, 2, 3, 4, 5],
    });
  });

  it("skips empty tokens such as a trailing comma", () => {
    expect(parseFocusPositions("1,2,,3,4,5,")).toEqual({
      ok: true,
      positions: [1, 2, 3, 4, 5],
    });
  });

  it("treats a single-position range as that position", () => {
    expect(parseFocusPositions("7-7,1-4")).toEqual({
      ok: true,
      positions: [1, 2, 3, 4, 7],
    });
  });

  it("parses an empty or blank input to an empty list, which clears the focus", () => {
    expect(parseFocusPositions("")).toEqual({ ok: true, positions: [] });
    expect(parseFocusPositions(" , ")).toEqual({ ok: true, positions: [] });
  });

  it.each(["abc", "1.5", "-3", "4-", "1-2-3", "5 6", "1e2"])(
    "refuses %s as an invalid token",
    (token) => {
      expect(parseFocusPositions(`10-14,${token}`)).toEqual({
        error: { kind: "invalidToken", token },
        ok: false,
      });
    }
  );

  it.each(["0", "53", "50-53", "0-4"])(
    "refuses %s as outside the deck",
    (token) => {
      expect(parseFocusPositions(`10-14,${token}`)).toEqual({
        error: { kind: "outOfRange", token },
        ok: false,
      });
    }
  );

  it("refuses a reversed range and suggests it the right way round", () => {
    expect(parseFocusPositions("1-5,31-28")).toEqual({
      error: { fixed: "28-31", kind: "reversedRange", token: "31-28" },
      ok: false,
    });
  });

  it("refuses a position listed twice", () => {
    expect(parseFocusPositions("1-5,3")).toEqual({
      error: { kind: "duplicate", position: 3 },
      ok: false,
    });
  });

  it("refuses overlapping ranges as a duplicate", () => {
    expect(parseFocusPositions("1-5,5-9")).toEqual({
      error: { kind: "duplicate", position: 5 },
      ok: false,
    });
  });

  it("refuses fewer positions than there are choices", () => {
    expect(parseFocusPositions("1,2,3,4")).toEqual({
      error: { count: 4, kind: "tooFew" },
      ok: false,
    });
  });

  it("accepts exactly as many positions as there are choices", () => {
    expect(parseFocusPositions("1-5")).toEqual({
      ok: true,
      positions: [1, 2, 3, 4, 5],
    });
  });
});

describe("formatFocusPositions", () => {
  it("writes runs of three or more as ranges and keeps pairs apart", () => {
    expect(formatFocusPositions([23, 24, 28, 29, 30, 31, 42])).toBe(
      "23, 24, 28-31, 42"
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(formatFocusPositions([])).toBe("");
  });

  it("formats to text that parses back to the same positions", () => {
    const positions = [1, 2, 3, 10, 12, 13, 50, 51, 52];
    expect(parseFocusPositions(formatFocusPositions(positions))).toEqual({
      ok: true,
      positions,
    });
  });
});

describe("isFocusPositionList", () => {
  it("accepts an empty list and a sorted list of at least five positions", () => {
    expect(isFocusPositionList([])).toBe(true);
    expect(isFocusPositionList([1, 2, 3, 4, 52])).toBe(true);
  });

  it.each([
    ["a non-array", { 0: 1 }],
    ["fewer than five positions", [1, 2, 3, 4]],
    ["an unsorted list", [2, 1, 3, 4, 5]],
    ["a duplicate", [1, 1, 2, 3, 4]],
    ["a position outside the deck", [1, 2, 3, 4, 53]],
    ["a non-integer", [1, 2, 3, 4, 4.5]],
    ["a string", [1, 2, 3, 4, "5"]],
  ])("rejects %s", (_label, value) => {
    expect(isFocusPositionList(value)).toBe(false);
  });
});

describe("isRecordedFocusPositions", () => {
  it("accepts any non-empty sorted list, whatever the input minimum", () => {
    expect(isRecordedFocusPositions([7])).toBe(true);
    expect(isRecordedFocusPositions([1, 2, 3, 4, 52])).toBe(true);
  });

  it("rejects an empty, unsorted or out-of-deck list", () => {
    expect(isRecordedFocusPositions([])).toBe(false);
    expect(isRecordedFocusPositions([2, 1])).toBe(false);
    expect(isRecordedFocusPositions([0, 1])).toBe(false);
  });
});

describe("isSamePositions", () => {
  const list = [1, 2, 3].map(createDeckPosition);

  it("compares lists by content", () => {
    expect(isSamePositions(list, [...list])).toBe(true);
    expect(isSamePositions(list, [1, 2, 4].map(createDeckPosition))).toBe(
      false
    );
    expect(isSamePositions(list, list.slice(0, 2))).toBe(false);
  });

  it("treats a missing list as equal only to another missing list", () => {
    expect(isSamePositions(undefined, undefined)).toBe(true);
    expect(isSamePositions(list, undefined)).toBe(false);
  });
});
