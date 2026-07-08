import { describe, expect, it } from "vitest";
import type { StackLimits } from "../types/stack-limits";
import { createDeckPosition } from "../types/stacks";
import {
  applyOffset,
  computeDistance,
  getValidDistanceRange,
  pickComputeDistractors,
  pickRandomOffset,
} from "./distance";

const SAME_CARD_REGEX = /same card/i;
const EMPTY_RANGE_REGEX = /empty range/;

const limitsOf = (start: number, end: number): StackLimits => ({
  end: createDeckPosition(end),
  start: createDeckPosition(start),
});

const FULL = limitsOf(1, 52);

describe("computeDistance — cyclic convention, full deck", () => {
  it("returns +1 for adjacent cards forward", () => {
    expect(computeDistance(0, 1, "cyclic", FULL)).toBe(1);
  });

  it("returns 51 for adjacent cards backward (wraps the long way)", () => {
    expect(computeDistance(1, 0, "cyclic", FULL)).toBe(51);
  });

  it("returns 26 for half-deck forward", () => {
    expect(computeDistance(0, 26, "cyclic", FULL)).toBe(26);
  });

  it("returns 26 for half-deck backward (wraps to forward 26)", () => {
    expect(computeDistance(26, 0, "cyclic", FULL)).toBe(26);
  });

  it("throws when both indices are the same", () => {
    expect(() => computeDistance(5, 5, "cyclic", FULL)).toThrow(
      SAME_CARD_REGEX
    );
  });
});

describe("computeDistance — signed convention, full deck", () => {
  it("returns +1 for adjacent cards forward", () => {
    expect(computeDistance(0, 1, "signed", FULL)).toBe(1);
  });

  it("returns -1 for adjacent cards backward", () => {
    expect(computeDistance(1, 0, "signed", FULL)).toBe(-1);
  });

  it("returns +25 for forward 25 (still positive — under half)", () => {
    expect(computeDistance(0, 25, "signed", FULL)).toBe(25);
  });

  it("returns +26 at exactly half-cycle (tie-break to positive)", () => {
    expect(computeDistance(0, 26, "signed", FULL)).toBe(26);
  });

  it("returns -25 for forward 27 (becomes 27 - 52 = -25)", () => {
    expect(computeDistance(0, 27, "signed", FULL)).toBe(-25);
  });

  it("returns -25 for backward 25 (signed shortest)", () => {
    expect(computeDistance(25, 0, "signed", FULL)).toBe(-25);
  });

  it("throws when both indices are the same", () => {
    expect(() => computeDistance(10, 10, "signed", FULL)).toThrow(
      SAME_CARD_REGEX
    );
  });
});

describe("computeDistance — restricted range", () => {
  const range = limitsOf(10, 20); // cycleSize = 11 (odd)

  it("treats the active range as the cycle", () => {
    // pos 10 → pos 11: forward 1
    expect(computeDistance(9, 10, "cyclic", range)).toBe(1);
    // pos 20 → pos 10: forward wraps within range, distance 1
    expect(computeDistance(19, 9, "cyclic", range)).toBe(1);
    // pos 10 → pos 20: forward 10 = cycleSize - 1
    expect(computeDistance(9, 19, "cyclic", range)).toBe(10);
  });

  it("signed gives shortest path within the range cycle", () => {
    expect(computeDistance(9, 10, "signed", range)).toBe(1);
    expect(computeDistance(9, 19, "signed", range)).toBe(-1); // 10 forward becomes -1 in cycle of 11
    expect(computeDistance(19, 9, "signed", range)).toBe(1); // 1 forward (wraps)
    // forward 5 in cycle 11 (odd): +5 stays positive
    expect(computeDistance(9, 14, "signed", range)).toBe(5);
    // forward 6 in cycle 11: > half (5.5) so -5
    expect(computeDistance(9, 15, "signed", range)).toBe(-5);
  });
});

describe("computeDistance — even cycle tie-break", () => {
  const cycle6 = limitsOf(1, 6); // even
  it("returns +3 at the half-cycle boundary (tie favors positive)", () => {
    expect(computeDistance(0, 3, "signed", cycle6)).toBe(3);
  });
  it("returns -2 for forward 4 in cycle 6 (4 > 3, so 4 - 6 = -2)", () => {
    expect(computeDistance(0, 4, "signed", cycle6)).toBe(-2);
  });
});

describe("applyOffset", () => {
  it("advances forward within the cycle", () => {
    const result = applyOffset(0, 5, FULL);
    expect(result.zeroBased).toBe(5);
    expect(result.index).toBe(6);
  });

  it("wraps around the end of the cycle", () => {
    const result = applyOffset(50, 5, FULL); // 50 + 5 = 55, wraps to 3 (zero-based)
    expect(result.zeroBased).toBe(3);
    expect(result.index).toBe(4);
  });

  it("supports negative offsets (backward)", () => {
    const result = applyOffset(2, -5, FULL); // 2 - 5 = -3, wraps to 49
    expect(result.zeroBased).toBe(49);
    expect(result.index).toBe(50);
  });

  it("respects restricted range when wrapping", () => {
    const range = limitsOf(10, 20); // zero-based 9..19, cycleSize 11
    // start at zero-based 9 (range pos 0), offset +1 → range pos 1 → zero-based 10
    expect(applyOffset(9, 1, range).zeroBased).toBe(10);
    // start at zero-based 19 (range pos 10), offset +1 → range pos 0 → zero-based 9
    expect(applyOffset(19, 1, range).zeroBased).toBe(9);
    // negative wrap
    expect(applyOffset(9, -1, range).zeroBased).toBe(19);
  });

  it("round-trips with computeDistance under cyclic convention", () => {
    for (let from = 0; from < 52; from += 1) {
      for (let offset = 1; offset < 52; offset += 1) {
        const { zeroBased: to } = applyOffset(from, offset, FULL);
        expect(computeDistance(from, to, "cyclic", FULL)).toBe(offset);
      }
    }
  });

  it("round-trips with computeDistance under signed convention (modulo cycle)", () => {
    const range = limitsOf(1, 13); // cycleSize 13 (odd)
    for (let from = 0; from < 13; from += 1) {
      for (let offset = -6; offset <= 6; offset += 1) {
        if (offset === 0) {
          continue;
        }
        const { zeroBased: to } = applyOffset(from, offset, range);
        expect(computeDistance(from, to, "signed", range)).toBe(offset);
      }
    }
  });
});

describe("getValidDistanceRange — cardinality is always cycleSize - 1", () => {
  for (const cycleSize of [3, 4, 5, 6, 7, 13, 26, 51, 52]) {
    it(`cyclic, cycleSize=${cycleSize}`, () => {
      const result = getValidDistanceRange("cyclic", cycleSize);
      expect(result).toHaveLength(cycleSize - 1);
      expect(new Set(result).size).toBe(cycleSize - 1);
      expect(result).not.toContain(0);
      expect(Math.min(...result)).toBe(1);
      expect(Math.max(...result)).toBe(cycleSize - 1);
    });

    it(`signed, cycleSize=${cycleSize}`, () => {
      const result = getValidDistanceRange("signed", cycleSize);
      expect(result).toHaveLength(cycleSize - 1);
      expect(new Set(result).size).toBe(cycleSize - 1);
      expect(result).not.toContain(0);
      // For cycleSize >= 3, the signed set always contains at least one
      // negative; the smallest is -ceil(N/2)+1 (which is always ≤ -1 here).
      expect(Math.min(...result)).toBe(-Math.ceil(cycleSize / 2) + 1);
      expect(Math.max(...result)).toBe(Math.floor(cycleSize / 2));
    });
  }

  it("degenerate cycleSize=2 returns [1] under both conventions", () => {
    expect(getValidDistanceRange("cyclic", 2)).toEqual([1]);
    expect(getValidDistanceRange("signed", 2)).toEqual([1]);
  });

  it("signed, cycleSize=6 has the expected explicit set", () => {
    expect(new Set(getValidDistanceRange("signed", 6))).toEqual(
      new Set([-2, -1, 1, 2, 3])
    );
  });

  it("signed, cycleSize=7 has the expected explicit set", () => {
    expect(new Set(getValidDistanceRange("signed", 7))).toEqual(
      new Set([-3, -2, -1, 1, 2, 3])
    );
  });

  it("signed, cycleSize=52 has the expected bounds", () => {
    const result = getValidDistanceRange("signed", 52);
    expect(result).toHaveLength(51);
    expect(Math.min(...result)).toBe(-25);
    expect(Math.max(...result)).toBe(26);
  });
});

describe("pickComputeDistractors", () => {
  it("returns the requested count", () => {
    const result = pickComputeDistractors(10, "cyclic", 52, 4);
    expect(result).toHaveLength(4);
  });

  it("excludes the answer", () => {
    const result = pickComputeDistractors(10, "cyclic", 52, 4);
    expect(result).not.toContain(10);
  });

  it("returns unique values", () => {
    const result = pickComputeDistractors(10, "cyclic", 52, 4);
    expect(new Set(result).size).toBe(result.length);
  });

  it("favors values nearby the answer", () => {
    const result = pickComputeDistractors(10, "cyclic", 52, 4);
    for (const v of result) {
      expect(Math.abs(v - 10)).toBeLessThanOrEqual(2);
    }
  });

  it("never returns 0 under signed convention", () => {
    const result = pickComputeDistractors(1, "signed", 52, 4);
    expect(result).not.toContain(0);
  });

  it("returns the available pool when count exceeds range size minus 1", () => {
    // signed cycle 6 has set {-2,-1,1,2,3} = 5 values; minus answer = 4 values; ask for 10
    const result = pickComputeDistractors(2, "signed", 6, 10);
    expect(result).toHaveLength(4);
    expect(result).not.toContain(2);
  });

  it("randomizes the order of tied (equidistant) distractors", () => {
    // Signed cycle 6 has set {-2, -1, 1, 2, 3}. With answer = 1, the
    // absolute-distance buckets are: |−1−1|=2, |−2−1|=3, |2−1|=1, |3−1|=2.
    // The bucket at distance 2 contains both -1 and 3 (a tie). Asking for
    // 4 distractors forces both tied values to be returned, but the order
    // within the tied pair must be randomized — a deterministic order
    // would indicate the Fisher-Yates pass over each bucket regressed.
    const orderings = new Map<string, number>();
    const TIE_PAIR = new Set([-1, 3]);
    for (let i = 0; i < 200; i += 1) {
      const result = pickComputeDistractors(1, "signed", 6, 4);
      // Find the positions of the two tied values to record their order.
      const seq = result.filter((v) => TIE_PAIR.has(v)).join(",");
      orderings.set(seq, (orderings.get(seq) ?? 0) + 1);
    }
    // Both orderings must appear several times — flake margin: > 5 each.
    expect(orderings.get("-1,3") ?? 0).toBeGreaterThan(5);
    expect(orderings.get("3,-1") ?? 0).toBeGreaterThan(5);
  });
});

describe("pickRandomOffset", () => {
  it("returns a value from the convention's valid set", () => {
    const valid = new Set(getValidDistanceRange("cyclic", 13));
    for (let i = 0; i < 100; i += 1) {
      expect(valid.has(pickRandomOffset("cyclic", 13))).toBe(true);
    }
  });

  it("never returns 0 under signed convention", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(pickRandomOffset("signed", 13)).not.toBe(0);
    }
  });

  it("throws on degenerate cycleSize=1 (empty valid set)", () => {
    expect(() => pickRandomOffset("cyclic", 1)).toThrow(EMPTY_RANGE_REGEX);
    expect(() => pickRandomOffset("signed", 1)).toThrow(EMPTY_RANGE_REGEX);
  });

  it("returns both positive and negative values under signed convention", () => {
    // Signed cycle 6 has set {-2, -1, 1, 2, 3}. Across many draws, both
    // signs must appear — a regression that biased toward only positives
    // (or only negatives) would otherwise silently pass the membership
    // test above.
    let sawNegative = false;
    let sawPositive = false;
    for (let i = 0; i < 200; i += 1) {
      const v = pickRandomOffset("signed", 6);
      if (v < 0) {
        sawNegative = true;
      }
      if (v > 0) {
        sawPositive = true;
      }
      if (sawNegative && sawPositive) {
        break;
      }
    }
    expect(sawNegative).toBe(true);
    expect(sawPositive).toBe(true);
  });
});
