import { describe, expect, it, vi } from "vitest";
import { createDeckPosition, type PlayingCardPosition } from "../types/stacks";
import { mnemonica } from "../types/stacks/mnemonica";
import { getNeighborCard, resolveDirection } from "./neighbor";

const stackOrder = mnemonica.order;

const makeCardPosition = (index: number): PlayingCardPosition => ({
  index: createDeckPosition(index),
  card: stackOrder[index - 1],
});

describe("resolveDirection", () => {
  it("returns 'before' when direction is 'before'", () => {
    expect(resolveDirection("before")).toBe("before");
  });

  it("returns 'after' when direction is 'after'", () => {
    expect(resolveDirection("after")).toBe("after");
  });

  it("returns 'before' or 'after' when direction is 'random'", () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(resolveDirection("random"));
    }
    expect(results.has("before")).toBe(true);
    expect(results.has("after")).toBe(true);
    expect(results.size).toBe(2);
  });

  it("returns 'before' when random returns < 0.5", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    expect(resolveDirection("random")).toBe("before");
    vi.restoreAllMocks();
  });

  it("returns 'after' when random returns >= 0.5", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    expect(resolveDirection("random")).toBe("after");
    vi.restoreAllMocks();
  });
});

describe("getNeighborCard", () => {
  it("returns the card after when direction is 'after'", () => {
    const questionCard = makeCardPosition(5);
    const neighbor = getNeighborCard(stackOrder, questionCard, "after");
    expect(neighbor.index).toBe(6);
    expect(neighbor.card).toBe(stackOrder[5]);
  });

  it("returns the card before when direction is 'before'", () => {
    const questionCard = makeCardPosition(5);
    const neighbor = getNeighborCard(stackOrder, questionCard, "before");
    expect(neighbor.index).toBe(4);
    expect(neighbor.card).toBe(stackOrder[3]);
  });

  it("wraps around from position 52 to position 1 for 'after'", () => {
    const questionCard = makeCardPosition(52);
    const neighbor = getNeighborCard(stackOrder, questionCard, "after");
    expect(neighbor.index).toBe(1);
    expect(neighbor.card).toBe(stackOrder[0]);
  });

  it("wraps around from position 1 to position 52 for 'before'", () => {
    const questionCard = makeCardPosition(1);
    const neighbor = getNeighborCard(stackOrder, questionCard, "before");
    expect(neighbor.index).toBe(52);
    expect(neighbor.card).toBe(stackOrder[51]);
  });

  it("returns position 2 when asking for the card after position 1", () => {
    const questionCard = makeCardPosition(1);
    const neighbor = getNeighborCard(stackOrder, questionCard, "after");
    expect(neighbor.index).toBe(2);
    expect(neighbor.card).toBe(stackOrder[1]);
  });

  it("returns position 51 when asking for the card before position 52", () => {
    const questionCard = makeCardPosition(52);
    const neighbor = getNeighborCard(stackOrder, questionCard, "before");
    expect(neighbor.index).toBe(51);
    expect(neighbor.card).toBe(stackOrder[50]);
  });

  it("returns a valid PlayingCardPosition with branded index", () => {
    const questionCard = makeCardPosition(25);
    const neighbor = getNeighborCard(stackOrder, questionCard, "after");
    expect(neighbor).toHaveProperty("index");
    expect(neighbor).toHaveProperty("card");
    expect(neighbor.card).toHaveProperty("suit");
    expect(neighbor.card).toHaveProperty("rank");
    expect(neighbor.card).toHaveProperty("image");
  });
});
