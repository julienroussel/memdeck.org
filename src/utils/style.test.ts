import { describe, expect, it } from "vitest";
import { cssVarCounterStyle } from "./style";

describe("cssVarCounterStyle", () => {
  describe("basic calculations", () => {
    it("calculates --i correctly for first item", () => {
      // index=0, size=5, offset=0 -> 0 + 1 - 5 + 0 = -4
      const result = cssVarCounterStyle(0, 5, 0);

      expect(result["--i"]).toBe(-4);
    });

    it("calculates --i correctly for middle item", () => {
      // index=2, size=5, offset=0 -> 2 + 1 - 5 + 0 = -2
      const result = cssVarCounterStyle(2, 5, 0);

      expect(result["--i"]).toBe(-2);
    });

    it("calculates --i correctly for last item", () => {
      // index=4, size=5, offset=0 -> 4 + 1 - 5 + 0 = 0
      const result = cssVarCounterStyle(4, 5, 0);

      expect(result["--i"]).toBe(0);
    });

    it("applies offset correctly", () => {
      // index=0, size=5, offset=2 -> 0 + 1 - 5 + 2 = -2
      const result = cssVarCounterStyle(0, 5, 2);

      expect(result["--i"]).toBe(-2);
    });
  });

  describe("return value structure", () => {
    it("returns an object with --i property", () => {
      const result = cssVarCounterStyle(0, 1, 0);

      expect(result).toHaveProperty("--i");
    });

    it("returns object that can be used as CSS style", () => {
      const result = cssVarCounterStyle(0, 5, 0);

      expect(typeof result).toBe("object");
      expect(typeof result["--i"]).toBe("number");
    });
  });

  describe("edge cases", () => {
    it("handles size of 1", () => {
      // index=0, size=1, offset=0 -> 0 + 1 - 1 + 0 = 0
      const result = cssVarCounterStyle(0, 1, 0);

      expect(result["--i"]).toBe(0);
    });

    it("handles zero offset", () => {
      // index=2, size=3, offset=0 -> 2 + 1 - 3 + 0 = 0
      const result = cssVarCounterStyle(2, 3, 0);

      expect(result["--i"]).toBe(0);
    });

    it("handles negative offset", () => {
      // index=0, size=5, offset=-2 -> 0 + 1 - 5 + (-2) = -6
      const result = cssVarCounterStyle(0, 5, -2);

      expect(result["--i"]).toBe(-6);
    });

    it("handles large index values", () => {
      // index=51, size=52, offset=0 -> 51 + 1 - 52 + 0 = 0
      const result = cssVarCounterStyle(51, 52, 0);

      expect(result["--i"]).toBe(0);
    });

    it("handles large offset values", () => {
      // index=0, size=5, offset=100 -> 0 + 1 - 5 + 100 = 96
      const result = cssVarCounterStyle(0, 5, 100);

      expect(result["--i"]).toBe(96);
    });
  });

  describe("formula verification: --i = index + 1 - size + offset", () => {
    it.each([
      { index: 0, size: 5, offset: 0, expected: -4 },
      { index: 1, size: 5, offset: 0, expected: -3 },
      { index: 2, size: 5, offset: 0, expected: -2 },
      { index: 3, size: 5, offset: 0, expected: -1 },
      { index: 4, size: 5, offset: 0, expected: 0 },
      { index: 0, size: 3, offset: 1, expected: -1 },
      { index: 1, size: 3, offset: 1, expected: 0 },
      { index: 2, size: 3, offset: 1, expected: 1 },
      { index: 0, size: 1, offset: 0, expected: 0 },
      { index: 0, size: 10, offset: 5, expected: -4 },
      { index: 9, size: 10, offset: 0, expected: 0 },
      { index: 25, size: 52, offset: 0, expected: -26 },
    ])("index=$index, size=$size, offset=$offset -> --i=$expected", ({
      index,
      size,
      offset,
      expected,
    }) => {
      const result = cssVarCounterStyle(index, size, offset);

      expect(result["--i"]).toBe(expected);
    });
  });

  describe("card spread use case", () => {
    it("generates correct sequence for 5-card spread", () => {
      const results: (number | string)[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(cssVarCounterStyle(i, 5, 0)["--i"]);
      }

      expect(results).toEqual([-4, -3, -2, -1, 0]);
    });

    it("generates correct sequence for 5-card spread with offset", () => {
      const results: (number | string)[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(cssVarCounterStyle(i, 5, 2)["--i"]);
      }

      expect(results).toEqual([-2, -1, 0, 1, 2]);
    });

    it("generates centered sequence when offset equals half size", () => {
      const size = 5;
      const offset = Math.floor(size / 2);
      const results: (number | string)[] = [];

      for (let i = 0; i < size; i++) {
        results.push(cssVarCounterStyle(i, size, offset)["--i"]);
      }

      // With size=5 and offset=2, we get: -2, -1, 0, 1, 2
      expect(results).toEqual([-2, -1, 0, 1, 2]);
    });
  });
});
