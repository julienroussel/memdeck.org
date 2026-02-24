import { describe, expect, it } from "vitest";
import { DECK_SIZE } from "../../constants";
import { mnemonica } from "../../types/stacks/mnemonica";
import { computeSequences } from "./compute-sequences";

const stack = mnemonica.order;

describe("computeSequences", () => {
  it("returns 1 cycle of 52 cards for step=1", () => {
    const result = computeSequences(stack, 1);
    expect(result.cycleCount).toBe(1);
    expect(result.cycleLength).toBe(52);
    expect(result.cycles).toHaveLength(1);
    expect(result.cycles[0]).toHaveLength(52);
  });

  it("returns 2 cycles of 26 cards for step=2", () => {
    const result = computeSequences(stack, 2);
    expect(result.cycleCount).toBe(2);
    expect(result.cycleLength).toBe(26);
    expect(result.cycles).toHaveLength(2);
    for (const cycle of result.cycles) {
      expect(cycle).toHaveLength(26);
    }
  });

  it("returns 4 cycles of 13 cards for step=4", () => {
    const result = computeSequences(stack, 4);
    expect(result.cycleCount).toBe(4);
    expect(result.cycleLength).toBe(13);
    expect(result.cycles).toHaveLength(4);
    for (const cycle of result.cycles) {
      expect(cycle).toHaveLength(13);
    }
  });

  it("returns 13 cycles of 4 cards for step=13", () => {
    const result = computeSequences(stack, 13);
    expect(result.cycleCount).toBe(13);
    expect(result.cycleLength).toBe(4);
    expect(result.cycles).toHaveLength(13);
    for (const cycle of result.cycles) {
      expect(cycle).toHaveLength(4);
    }
  });

  it("returns 52 cycles of 1 card for step=52", () => {
    const result = computeSequences(stack, 52);
    expect(result.cycleCount).toBe(52);
    expect(result.cycleLength).toBe(1);
    expect(result.cycles).toHaveLength(52);
    for (const cycle of result.cycles) {
      expect(cycle).toHaveLength(1);
    }
  });

  it("returns 1 cycle of 52 cards for prime step=7", () => {
    const result = computeSequences(stack, 7);
    expect(result.cycleCount).toBe(1);
    expect(result.cycleLength).toBe(52);
    expect(result.cycles).toHaveLength(1);
    expect(result.cycles[0]).toHaveLength(52);
  });

  it("maps correct positions and cards per cycle", () => {
    const result = computeSequences(stack, 2);
    const firstCycle = result.cycles[0];
    // First cycle starts at position 1 (index 0), steps by 2
    expect(firstCycle[0].position).toBe(1);
    expect(firstCycle[0].card).toBe(stack[0]);
    expect(firstCycle[1].position).toBe(3);
    expect(firstCycle[1].card).toBe(stack[2]);
  });

  it("includes every card exactly once across all cycles", () => {
    for (const step of [1, 2, 4, 7, 13, 26, 52]) {
      const result = computeSequences(stack, step);
      const allPositions = result.cycles.flat().map((e) => e.position);
      expect(allPositions).toHaveLength(DECK_SIZE);
      expect(new Set(allPositions).size).toBe(DECK_SIZE);
    }
  });

  it("treats step=0 as step=1", () => {
    const result = computeSequences(stack, 0);
    expect(result.cycleCount).toBe(1);
    expect(result.cycleLength).toBe(52);
  });

  it("treats negative step as step=1", () => {
    const result = computeSequences(stack, -3);
    expect(result.cycleCount).toBe(1);
    expect(result.cycleLength).toBe(52);
  });

  it("treats NaN as step=1", () => {
    const result = computeSequences(stack, Number.NaN);
    expect(result.cycleCount).toBe(1);
    expect(result.cycleLength).toBe(52);
  });

  it("treats Infinity as step=1", () => {
    const result = computeSequences(stack, Number.POSITIVE_INFINITY);
    expect(result.cycleCount).toBe(1);
    expect(result.cycleLength).toBe(52);
  });

  it("floors fractional step values", () => {
    const result = computeSequences(stack, 2.7);
    expect(result.cycleCount).toBe(2);
    expect(result.cycleLength).toBe(26);
  });
});
