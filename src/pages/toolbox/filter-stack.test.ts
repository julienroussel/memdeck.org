import { describe, expect, it } from "vitest";
import { stacks } from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";
import { filterStack } from "./filter-stack";

const stackOrder = stacks.mnemonica.order;

describe("filterStack", () => {
  it("returns all 52 cards when query is empty", () => {
    expect(filterStack(stackOrder, "", formatCardName)).toHaveLength(52);
  });

  it("returns all 52 cards when query is whitespace", () => {
    expect(filterStack(stackOrder, "   ", formatCardName)).toHaveLength(52);
  });

  it("matches partial card name case-insensitively", () => {
    const results = filterStack(stackOrder, "ace", formatCardName);
    expect(results).toHaveLength(4);
    for (const entry of results) {
      expect(entry.card.rank).toBe("A");
    }
  });

  it("matches by suit name", () => {
    const results = filterStack(stackOrder, "hearts", formatCardName);
    expect(results).toHaveLength(13);
    for (const entry of results) {
      expect(entry.card.suit).toBe("hearts");
    }

    // Verify positions are preserved from original stack (not re-indexed)
    const positions = results.map((e) => e.position);
    expect(positions).not.toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  });

  it("matches by position number", () => {
    const results = filterStack(stackOrder, "42", formatCardName);
    expect(results).toHaveLength(1);
    expect(results[0].position).toBe(42);
  });

  it("matches full card name", () => {
    const results = filterStack(stackOrder, "7 of clubs", formatCardName);
    expect(results).toHaveLength(1);
    expect(results[0].card.rank).toBe("7");
    expect(results[0].card.suit).toBe("clubs");
  });

  it("returns empty array for no-match queries", () => {
    const results = filterStack(stackOrder, "zzz", formatCardName);
    expect(results).toHaveLength(0);
  });

  it("assigns correct 1-based positions", () => {
    const results = filterStack(stackOrder, "", formatCardName);
    expect(results[0].position).toBe(1);
    expect(results[51].position).toBe(52);
  });

  it("uses the provided formatter for matching", () => {
    const germanFormatter = () => "Herz Ass";
    const results = filterStack(stackOrder, "herz", germanFormatter);
    expect(results).toHaveLength(52);
  });
});
