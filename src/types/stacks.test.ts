import { describe, expect, it, vi } from "vitest";
import { DECK_SIZE } from "../constants";
import {
  createDeckPosition,
  getCardAt,
  getRandomPlayingCard,
  getUniqueRandomCard,
  type PlayingCardPosition,
  stacks,
} from "./stacks";

const testStack = stacks.mnemonica.order;

describe("createDeckPosition", () => {
  it("returns a branded DeckPosition for valid integers 1-52", () => {
    for (let i = 1; i <= DECK_SIZE; i++) {
      const position = createDeckPosition(i);
      expect(position).toBe(i);
    }
  });

  it("returns position 1 for the minimum valid value", () => {
    expect(createDeckPosition(1)).toBe(1);
  });

  it("returns position 52 for the maximum valid value", () => {
    expect(createDeckPosition(52)).toBe(52);
  });

  it("throws for zero", () => {
    expect(() => createDeckPosition(0)).toThrow(
      "Invalid deck position: 0. Must be integer 1-52."
    );
  });

  it("throws for negative numbers", () => {
    expect(() => createDeckPosition(-1)).toThrow(
      "Invalid deck position: -1. Must be integer 1-52."
    );
  });

  it("throws for numbers greater than 52", () => {
    expect(() => createDeckPosition(53)).toThrow(
      "Invalid deck position: 53. Must be integer 1-52."
    );
  });

  it("throws for non-integer decimal numbers", () => {
    expect(() => createDeckPosition(1.5)).toThrow(
      "Invalid deck position: 1.5. Must be integer 1-52."
    );
  });

  it("throws for NaN", () => {
    expect(() => createDeckPosition(Number.NaN)).toThrow(
      "Invalid deck position: NaN. Must be integer 1-52."
    );
  });

  it("throws for Infinity", () => {
    expect(() => createDeckPosition(Number.POSITIVE_INFINITY)).toThrow(
      "Invalid deck position: Infinity. Must be integer 1-52."
    );
  });

  it("throws for negative Infinity", () => {
    expect(() => createDeckPosition(Number.NEGATIVE_INFINITY)).toThrow(
      "Invalid deck position: -Infinity. Must be integer 1-52."
    );
  });
});

describe("getCardAt", () => {
  it("returns the card at index 0 (first card)", () => {
    const card = getCardAt(testStack, 0);
    expect(card).toBe(testStack[0]);
  });

  it("returns the card at index 51 (last card)", () => {
    const card = getCardAt(testStack, 51);
    expect(card).toBe(testStack[51]);
  });

  it("returns the correct card for every valid index", () => {
    for (let i = 0; i < DECK_SIZE; i++) {
      const card = getCardAt(testStack, i);
      expect(card).toBe(testStack[i]);
    }
  });

  it("throws for negative index", () => {
    expect(() => getCardAt(testStack, -1)).toThrow(
      "Invalid stack index: -1. Must be 0-51."
    );
  });

  it("throws for index 52 (out of bounds)", () => {
    expect(() => getCardAt(testStack, 52)).toThrow(
      "Invalid stack index: 52. Must be 0-51."
    );
  });

  it("throws for large out-of-bounds index", () => {
    expect(() => getCardAt(testStack, 100)).toThrow(
      "Invalid stack index: 100. Must be 0-51."
    );
  });
});

describe("getRandomPlayingCard", () => {
  it("returns a valid card position with 1-based index", () => {
    const result = getRandomPlayingCard(testStack);

    expect(result.index).toBeGreaterThanOrEqual(1);
    expect(result.index).toBeLessThanOrEqual(DECK_SIZE);
    expect(result.card).toBeDefined();
    expect(result.card.suit).toBeDefined();
    expect(result.card.rank).toBeDefined();
  });

  it("returns the card at the correct position", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = getRandomPlayingCard(testStack);

    expect(result.index).toBe(1);
    expect(result.card).toBe(testStack[0]);

    vi.restoreAllMocks();
  });
});

describe("getUniqueRandomCard", () => {
  it("returns a valid card when existingChoices is empty", () => {
    const result = getUniqueRandomCard(testStack, []);

    expect(result.index).toBeGreaterThanOrEqual(1);
    expect(result.index).toBeLessThanOrEqual(DECK_SIZE);
    expect(result.card).toBeDefined();
  });

  it("returns a card not in existingChoices", () => {
    const existingChoices: PlayingCardPosition[] = [
      { index: createDeckPosition(1), card: testStack[0] },
      { index: createDeckPosition(2), card: testStack[1] },
      { index: createDeckPosition(3), card: testStack[2] },
    ];

    const result = getUniqueRandomCard(testStack, existingChoices);

    expect(result.index).not.toBe(1);
    expect(result.index).not.toBe(2);
    expect(result.index).not.toBe(3);
  });

  it("uses linear fallback when random selection keeps colliding", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const existingChoices: PlayingCardPosition[] = [
      { index: createDeckPosition(1), card: testStack[0] },
    ];

    const result = getUniqueRandomCard(testStack, existingChoices);

    expect(result.index).toBe(2);
    expect(result.card).toBe(testStack[1]);

    vi.restoreAllMocks();
  });

  it("finds the first available card in linear fallback", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const existingChoices: PlayingCardPosition[] = [];
    for (let i = 1; i <= 10; i++) {
      existingChoices.push({
        index: createDeckPosition(i),
        card: testStack[i - 1],
      });
    }

    const result = getUniqueRandomCard(testStack, existingChoices);

    expect(result.index).toBe(11);
    expect(result.card).toBe(testStack[10]);

    vi.restoreAllMocks();
  });

  it("throws error when all cards are already selected", () => {
    const allCards: PlayingCardPosition[] = [];
    for (let i = 1; i <= DECK_SIZE; i++) {
      allCards.push({
        index: createDeckPosition(i),
        card: testStack[i - 1],
      });
    }

    expect(() => getUniqueRandomCard(testStack, allCards)).toThrow(
      `Unable to find unique card - all ${DECK_SIZE} cards already selected`
    );
  });

  it("handles 51 existing choices and finds the last remaining card", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const existingChoices: PlayingCardPosition[] = [];
    for (let i = 1; i <= DECK_SIZE - 1; i++) {
      existingChoices.push({
        index: createDeckPosition(i),
        card: testStack[i - 1],
      });
    }

    const result = getUniqueRandomCard(testStack, existingChoices);

    expect(result.index).toBe(DECK_SIZE);
    expect(result.card).toBe(testStack[DECK_SIZE - 1]);

    vi.restoreAllMocks();
  });

  it("returns unique cards across multiple calls", () => {
    const results: PlayingCardPosition[] = [];

    for (let i = 0; i < 10; i++) {
      const result = getUniqueRandomCard(testStack, results);
      results.push(result);
    }

    const indices = results.map((r) => r.index);
    const uniqueIndices = new Set(indices);

    expect(uniqueIndices.size).toBe(10);
  });
});
