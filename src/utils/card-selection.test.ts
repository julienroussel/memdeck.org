import { describe, expect, it } from "vitest";
import { type PlayingCardPosition, stacks } from "../types/stacks";
import { generateUniqueCardChoices } from "./card-selection";

const testStack = stacks.mnemonica.order;

describe("generateUniqueCardChoices", () => {
  it("returns default 5 choices when no totalChoices specified", () => {
    const choices = generateUniqueCardChoices(testStack);

    expect(choices).toHaveLength(5);
  });

  it("returns the specified number of choices", () => {
    const choices = generateUniqueCardChoices(testStack, [], 10);

    expect(choices).toHaveLength(10);
  });

  it("includes initial choices in the result", () => {
    const initialChoices: PlayingCardPosition[] = [
      { index: 1, card: testStack[0] },
      { index: 2, card: testStack[1] },
    ];

    const choices = generateUniqueCardChoices(testStack, initialChoices, 5);

    expect(choices).toHaveLength(5);
    expect(choices).toContain(initialChoices[0]);
    expect(choices).toContain(initialChoices[1]);
  });

  it("returns all unique choices with no duplicates", () => {
    const choices = generateUniqueCardChoices(testStack, [], 20);

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);

    expect(uniqueIndices.size).toBe(20);
  });

  it("works with empty initial choices", () => {
    const choices = generateUniqueCardChoices(testStack, [], 3);

    expect(choices).toHaveLength(3);

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(3);
  });

  it("returns initial choices unchanged when already meeting totalChoices", () => {
    const initialChoices: PlayingCardPosition[] = [
      { index: 1, card: testStack[0] },
      { index: 2, card: testStack[1] },
      { index: 3, card: testStack[2] },
    ];

    const choices = generateUniqueCardChoices(testStack, initialChoices, 3);

    expect(choices).toHaveLength(3);
    expect(choices).toEqual(initialChoices);
  });

  it("returns initial choices unchanged when exceeding totalChoices", () => {
    const initialChoices: PlayingCardPosition[] = [
      { index: 1, card: testStack[0] },
      { index: 2, card: testStack[1] },
      { index: 3, card: testStack[2] },
      { index: 4, card: testStack[3] },
      { index: 5, card: testStack[4] },
    ];

    const choices = generateUniqueCardChoices(testStack, initialChoices, 3);

    expect(choices).toHaveLength(5);
    expect(choices).toEqual(initialChoices);
  });

  it("generates valid card positions with 1-based indices", () => {
    const choices = generateUniqueCardChoices(testStack, [], 10);

    for (const choice of choices) {
      expect(choice.index).toBeGreaterThanOrEqual(1);
      expect(choice.index).toBeLessThanOrEqual(52);
      expect(choice.card).toBeDefined();
      expect(choice.card.suit).toBeDefined();
      expect(choice.card.rank).toBeDefined();
    }
  });

  it("can generate up to 52 unique choices", () => {
    const choices = generateUniqueCardChoices(testStack, [], 52);

    expect(choices).toHaveLength(52);

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(52);
  });

  it("works with different stacks", () => {
    const aronsonChoices = generateUniqueCardChoices(
      stacks.aronson.order,
      [],
      5
    );
    const redfordChoices = generateUniqueCardChoices(
      stacks.redford.order,
      [],
      5
    );

    expect(aronsonChoices).toHaveLength(5);
    expect(redfordChoices).toHaveLength(5);
  });

  it("preserves order of initial choices at the start", () => {
    const initialChoices: PlayingCardPosition[] = [
      { index: 10, card: testStack[9] },
      { index: 20, card: testStack[19] },
    ];

    const choices = generateUniqueCardChoices(testStack, initialChoices, 5);

    expect(choices[0]).toEqual(initialChoices[0]);
    expect(choices[1]).toEqual(initialChoices[1]);
  });
});
