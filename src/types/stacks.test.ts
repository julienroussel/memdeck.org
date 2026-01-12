import { describe, expect, it, vi } from "vitest";
import {
  getRandomPlayingCard,
  getUniqueRandomCard,
  type PlayingCardPosition,
  stacks,
} from "./stacks";

const testStack = stacks.mnemonica.order;

describe("getRandomPlayingCard", () => {
  it("returns a valid card position with 1-based index", () => {
    const result = getRandomPlayingCard(testStack);

    expect(result.index).toBeGreaterThanOrEqual(1);
    expect(result.index).toBeLessThanOrEqual(52);
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
    expect(result.index).toBeLessThanOrEqual(52);
    expect(result.card).toBeDefined();
  });

  it("returns a card not in existingChoices", () => {
    const existingChoices: PlayingCardPosition[] = [
      { index: 1, card: testStack[0] },
      { index: 2, card: testStack[1] },
      { index: 3, card: testStack[2] },
    ];

    const result = getUniqueRandomCard(testStack, existingChoices);

    expect(result.index).not.toBe(1);
    expect(result.index).not.toBe(2);
    expect(result.index).not.toBe(3);
  });

  it("uses linear fallback when random selection keeps colliding", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const existingChoices: PlayingCardPosition[] = [
      { index: 1, card: testStack[0] },
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
      existingChoices.push({ index: i, card: testStack[i - 1] });
    }

    const result = getUniqueRandomCard(testStack, existingChoices);

    expect(result.index).toBe(11);
    expect(result.card).toBe(testStack[10]);

    vi.restoreAllMocks();
  });

  it("throws error when all 52 cards are already selected", () => {
    const allCards: PlayingCardPosition[] = [];
    for (let i = 1; i <= 52; i++) {
      allCards.push({ index: i, card: testStack[i - 1] });
    }

    expect(() => getUniqueRandomCard(testStack, allCards)).toThrow(
      "Unable to find unique card - all 52 cards already selected"
    );
  });

  it("handles 51 existing choices and finds the last remaining card", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const existingChoices: PlayingCardPosition[] = [];
    for (let i = 1; i <= 51; i++) {
      existingChoices.push({ index: i, card: testStack[i - 1] });
    }

    const result = getUniqueRandomCard(testStack, existingChoices);

    expect(result.index).toBe(52);
    expect(result.card).toBe(testStack[51]);

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
