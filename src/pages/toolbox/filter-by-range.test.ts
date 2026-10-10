import { describe, expect, it } from "vitest";
import type { StackLimits } from "../../types/stack-limits";
import { createDeckPosition, stacks } from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";
import { filterByRange } from "./filter-by-range";
import { filterStack } from "./filter-stack";

const stackOrder = stacks.mnemonica.order;
const allEntries = filterStack(stackOrder, "", formatCardName);

const range = (start: number, end: number): StackLimits => ({
  end: createDeckPosition(end),
  start: createDeckPosition(start),
});

const positionsOf = (entries: { position: number }[]): number[] =>
  entries.map((entry) => entry.position);

describe("filterByRange", () => {
  it("keeps every position of the full deck", () => {
    expect(filterByRange(allEntries, range(1, 52))).toHaveLength(52);
  });

  it("includes both the start and the end position", () => {
    expect(positionsOf(filterByRange(allEntries, range(10, 13)))).toEqual([
      10, 11, 12, 13,
    ]);
  });

  it("excludes the position just after the end", () => {
    const positions = positionsOf(filterByRange(allEntries, range(10, 13)));
    expect(positions).not.toContain(14);
  });

  it("excludes the position just before the start", () => {
    const positions = positionsOf(filterByRange(allEntries, range(10, 13)));
    expect(positions).not.toContain(9);
  });

  it("returns exactly one entry for a single-card range", () => {
    expect(positionsOf(filterByRange(allEntries, range(7, 7)))).toEqual([7]);
  });

  it("intersects with a search result, keeping only matches inside the range", () => {
    // "1" matches positions 1, 10-19, 21, 31, 41, 51 (plus any rank match).
    const searched = filterStack(stackOrder, "1", formatCardName);
    const positions = positionsOf(filterByRange(searched, range(10, 20)));
    expect(positions).toEqual(
      positionsOf(searched).filter((p) => p >= 10 && p <= 20)
    );
    expect(positions).toContain(10);
    expect(positions).toContain(19);
    expect(positions).not.toContain(21);
  });

  it("returns an empty array when no search match lies in the range", () => {
    const searched = filterStack(stackOrder, "52", formatCardName);
    expect(filterByRange(searched, range(1, 51))).toEqual([]);
  });
});
