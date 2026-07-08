import { describe, expect, it } from "vitest";
import { DEFAULT_STACK_LIMITS } from "../types/stack-limits";
import {
  createDeckPosition,
  type PlayingCardPosition,
  stacks,
} from "../types/stacks";
import {
  generateNeighborChoices,
  generateUniqueCardChoices,
} from "./card-selection";

const testStack = stacks.mnemonica.order;
const fullDeck = DEFAULT_STACK_LIMITS;

describe("generateUniqueCardChoices", () => {
  it("returns default 5 choices when no totalChoices specified", () => {
    const choices = generateUniqueCardChoices(testStack, fullDeck);

    expect(choices).toHaveLength(5);
  });

  it("returns the specified number of choices", () => {
    const choices = generateUniqueCardChoices(testStack, fullDeck, [], 10);

    expect(choices).toHaveLength(10);
  });

  it("includes initial choices in the result", () => {
    const initialChoices: PlayingCardPosition[] = [
      { card: testStack[0], index: createDeckPosition(1) },
      { card: testStack[1], index: createDeckPosition(2) },
    ];

    const choices = generateUniqueCardChoices(
      testStack,
      fullDeck,
      initialChoices,
      5
    );

    expect(choices).toHaveLength(5);
    expect(choices).toContain(initialChoices[0]);
    expect(choices).toContain(initialChoices[1]);
  });

  it("returns all unique choices with no duplicates", () => {
    const choices = generateUniqueCardChoices(testStack, fullDeck, [], 20);

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);

    expect(uniqueIndices.size).toBe(20);
  });

  it("works with empty initial choices", () => {
    const choices = generateUniqueCardChoices(testStack, fullDeck, [], 3);

    expect(choices).toHaveLength(3);

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(3);
  });

  it("returns initial choices unchanged when already meeting totalChoices", () => {
    const initialChoices: PlayingCardPosition[] = [
      { card: testStack[0], index: createDeckPosition(1) },
      { card: testStack[1], index: createDeckPosition(2) },
      { card: testStack[2], index: createDeckPosition(3) },
    ];

    const choices = generateUniqueCardChoices(
      testStack,
      fullDeck,
      initialChoices,
      3
    );

    expect(choices).toHaveLength(3);
    expect(choices).toEqual(initialChoices);
  });

  it("returns initial choices unchanged when exceeding totalChoices", () => {
    const initialChoices: PlayingCardPosition[] = [
      { card: testStack[0], index: createDeckPosition(1) },
      { card: testStack[1], index: createDeckPosition(2) },
      { card: testStack[2], index: createDeckPosition(3) },
      { card: testStack[3], index: createDeckPosition(4) },
      { card: testStack[4], index: createDeckPosition(5) },
    ];

    const choices = generateUniqueCardChoices(
      testStack,
      fullDeck,
      initialChoices,
      3
    );

    expect(choices).toHaveLength(5);
    expect(choices).toEqual(initialChoices);
  });

  it("generates valid card positions with 1-based indices", () => {
    const choices = generateUniqueCardChoices(testStack, fullDeck, [], 10);

    for (const choice of choices) {
      expect(choice.index).toBeGreaterThanOrEqual(1);
      expect(choice.index).toBeLessThanOrEqual(52);
      expect(choice.card).toBeDefined();
      expect(choice.card.suit).toBeDefined();
      expect(choice.card.rank).toBeDefined();
    }
  });

  it("can generate up to 52 unique choices", () => {
    const choices = generateUniqueCardChoices(testStack, fullDeck, [], 52);

    expect(choices).toHaveLength(52);

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(52);
  });

  it("works with different stacks", () => {
    const aronsonChoices = generateUniqueCardChoices(
      stacks.aronson.order,
      fullDeck,
      [],
      5
    );
    const redfordChoices = generateUniqueCardChoices(
      stacks.redford.order,
      fullDeck,
      [],
      5
    );

    expect(aronsonChoices).toHaveLength(5);
    expect(redfordChoices).toHaveLength(5);
  });

  it("preserves order of initial choices at the start", () => {
    const initialChoices: PlayingCardPosition[] = [
      { card: testStack[9], index: createDeckPosition(10) },
      { card: testStack[19], index: createDeckPosition(20) },
    ];

    const choices = generateUniqueCardChoices(
      testStack,
      fullDeck,
      initialChoices,
      5
    );

    expect(choices[0]).toEqual(initialChoices[0]);
    expect(choices[1]).toEqual(initialChoices[1]);
  });

  it("throws when totalChoices exceeds the range size", () => {
    const narrowLimits = {
      end: createDeckPosition(3),
      start: createDeckPosition(1),
    };
    expect(() =>
      generateUniqueCardChoices(testStack, narrowLimits, [], 5)
    ).toThrow("totalChoices (5) exceeds range size (3)");
  });

  it("only produces cards within a partial range", () => {
    const partialLimits = {
      end: createDeckPosition(10),
      start: createDeckPosition(1),
    };
    const choices = generateUniqueCardChoices(testStack, partialLimits, [], 5);

    expect(choices).toHaveLength(5);
    for (const choice of choices) {
      expect(choice.index).toBeGreaterThanOrEqual(1);
      expect(choice.index).toBeLessThanOrEqual(10);
    }
  });
});

describe("generateNeighborChoices", () => {
  // Position 1 in mnemonica = FourOfClubs, position 2 = TwoOfHearts
  const answerCard: PlayingCardPosition = {
    card: testStack[1],
    index: createDeckPosition(2),
  };
  const questionCard: PlayingCardPosition = {
    card: testStack[0],
    index: createDeckPosition(1),
  };

  it("returns the default number of choices (5)", () => {
    const choices = generateNeighborChoices(
      testStack,
      answerCard,
      questionCard,
      fullDeck
    );

    expect(choices).toHaveLength(5);
  });

  it("returns the specified number of choices when totalChoices is provided", () => {
    const choices = generateNeighborChoices(
      testStack,
      answerCard,
      questionCard,
      fullDeck,
      8
    );

    expect(choices).toHaveLength(8);
  });

  it("always includes the answerCard in the result", () => {
    const choices = generateNeighborChoices(
      testStack,
      answerCard,
      questionCard,
      fullDeck
    );

    const hasAnswer = choices.some(
      (c) =>
        c.card.suit === answerCard.card.suit &&
        c.card.rank === answerCard.card.rank
    );
    expect(hasAnswer).toBe(true);
  });

  it("never includes the questionCard in the result", () => {
    // Run multiple times to reduce false-pass probability
    for (let i = 0; i < 20; i += 1) {
      const choices = generateNeighborChoices(
        testStack,
        answerCard,
        questionCard,
        fullDeck
      );

      const hasQuestion = choices.some(
        (c) =>
          c.card.suit === questionCard.card.suit &&
          c.card.rank === questionCard.card.rank
      );
      expect(hasQuestion).toBe(false);
    }
  });

  it("returns choices with unique indices (no duplicate positions)", () => {
    const choices = generateNeighborChoices(
      testStack,
      answerCard,
      questionCard,
      fullDeck
    );

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(indices.length);
  });

  it("only produces choices within a partial range", () => {
    const partialLimits = {
      end: createDeckPosition(10),
      start: createDeckPosition(1),
    };
    const partialAnswer: PlayingCardPosition = {
      card: testStack[1],
      index: createDeckPosition(2),
    };
    const partialQuestion: PlayingCardPosition = {
      card: testStack[0],
      index: createDeckPosition(1),
    };

    const choices = generateNeighborChoices(
      testStack,
      partialAnswer,
      partialQuestion,
      partialLimits
    );

    expect(choices).toHaveLength(5);
    for (const choice of choices) {
      expect(choice.index).toBeGreaterThanOrEqual(1);
      expect(choice.index).toBeLessThanOrEqual(10);
    }
    expect(choices.every((c) => c.index !== partialQuestion.index)).toBe(true);
  });

  it("throws when totalChoices exceeds available pool (range size minus question card)", () => {
    const narrowLimits = {
      end: createDeckPosition(3),
      start: createDeckPosition(1),
    };
    const narrowAnswer: PlayingCardPosition = {
      card: testStack[1],
      index: createDeckPosition(2),
    };
    const narrowQuestion: PlayingCardPosition = {
      card: testStack[0],
      index: createDeckPosition(1),
    };

    // Range size is 3, effective pool is 2 (question card excluded), requesting 5
    expect(() =>
      generateNeighborChoices(
        testStack,
        narrowAnswer,
        narrowQuestion,
        narrowLimits,
        5
      )
    ).toThrow("totalChoices (5) exceeds available pool (2) in range 1-3");
  });
});
