import { describe, expect, it, vi } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("returns an array of the same length", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(items);

    expect(result).toHaveLength(items.length);
  });

  it("contains all original elements", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(items);

    expect(result.sort()).toEqual(items.sort());
  });

  it("does not mutate the original array", () => {
    const items = [1, 2, 3, 4, 5];
    const originalCopy = [...items];

    shuffle(items);

    expect(items).toEqual(originalCopy);
  });

  it("returns a new array instance", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(items);

    expect(result).not.toBe(items);
  });

  it("works with empty arrays", () => {
    const items: number[] = [];
    const result = shuffle(items);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("works with single element arrays", () => {
    const items = [42];
    const result = shuffle(items);

    expect(result).toEqual([42]);
    expect(result).toHaveLength(1);
  });

  it("works with string arrays", () => {
    const items = ["a", "b", "c", "d"];
    const result = shuffle(items);

    expect(result).toHaveLength(4);
    expect(result.sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("works with object arrays", () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const obj3 = { id: 3 };
    const items = [obj1, obj2, obj3];

    const result = shuffle(items);

    expect(result).toHaveLength(3);
    expect(result).toContain(obj1);
    expect(result).toContain(obj2);
    expect(result).toContain(obj3);
  });

  it("preserves object references", () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const items = [obj1, obj2];

    const result = shuffle(items);

    for (const item of result) {
      expect(item === obj1 || item === obj2).toBe(true);
    }
  });

  it("produces a known order with mocked Math.random", () => {
    const items = [1, 2, 3, 4, 5];

    // Mock Math.random to always return 0, which will swap each element with index 0
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = shuffle(items);

    // With random always 0: j is always 0
    // i=4: swap [4] and [0] -> [5,2,3,4,1]
    // i=3: swap [3] and [0] -> [4,2,3,5,1]
    // i=2: swap [2] and [0] -> [3,2,4,5,1]
    // i=1: swap [1] and [0] -> [2,3,4,5,1]
    expect(result).toEqual([2, 3, 4, 5, 1]);

    vi.restoreAllMocks();
  });

  it("produces different results with different random values", () => {
    const items = [1, 2, 3, 4, 5];

    // Mock to return 0.99 (will swap with last valid index each time)
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const result = shuffle(items);

    // With random ~1: j equals i each time, so no actual swaps occur
    // i=4: j=4, swap [4] with [4] -> no change
    // i=3: j=3, swap [3] with [3] -> no change
    // etc.
    expect(result).toEqual([1, 2, 3, 4, 5]);

    vi.restoreAllMocks();
  });

  it("can produce different orderings on multiple calls", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set<string>();

    // Run shuffle multiple times and collect unique orderings
    for (let i = 0; i < 100; i++) {
      const result = shuffle(items);
      results.add(JSON.stringify(result));
    }

    // With 10 items and 100 shuffles, we should get multiple different orderings
    // (probability of getting the same order twice is astronomically low)
    expect(results.size).toBeGreaterThan(1);
  });

  it("works with two element arrays", () => {
    const items = [1, 2];

    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = shuffle(items);

    // i=1: j=0, swap [1] and [0] -> [2, 1]
    expect(result).toEqual([2, 1]);

    vi.restoreAllMocks();
  });

  it("handles arrays with duplicate values", () => {
    const items = [1, 1, 2, 2, 3, 3];
    const result = shuffle(items);

    expect(result).toHaveLength(6);
    expect(result.filter((x) => x === 1)).toHaveLength(2);
    expect(result.filter((x) => x === 2)).toHaveLength(2);
    expect(result.filter((x) => x === 3)).toHaveLength(2);
  });
});
