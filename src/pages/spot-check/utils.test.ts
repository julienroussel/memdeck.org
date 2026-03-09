import { describe, expect, it, vi } from "vitest";
import { DECK_SIZE } from "../../constants";
import type { PlayingCard } from "../../types/playingcard";
import { stacks } from "../../types/stacks";
import { AceOfHearts } from "../../types/suits/hearts";
import { TwoOfSpades } from "../../types/suits/spades";
import {
  isSpotCheckAnswerCorrect,
  moveCard,
  removeSingleCard,
  swapTwoCards,
} from "./utils";

const testStack = stacks.mnemonica.order;
const twoCards: readonly PlayingCard[] = [AceOfHearts, TwoOfSpades];

describe("removeSingleCard", () => {
  it("returns 51 cards", () => {
    const result = removeSingleCard(testStack);
    expect(result.cards).toHaveLength(DECK_SIZE - 1);
  });

  it("removes exactly the reported missing card", () => {
    const result = removeSingleCard(testStack);
    expect(result.cards).not.toContain(result.missingCard);
  });

  it("preserves relative order of remaining cards", () => {
    const result = removeSingleCard(testStack);
    const expected = [
      ...testStack.slice(0, result.missingIndex),
      ...testStack.slice(result.missingIndex + 1),
    ];
    expect(result.cards).toEqual(expected);
  });

  it("returns the correct card from the original stack", () => {
    const result = removeSingleCard(testStack);
    expect(result.missingCard).toBe(testStack[result.missingIndex]);
  });

  it("works with a two-card array", () => {
    const result = removeSingleCard(twoCards);
    expect(result.cards).toHaveLength(1);
    expect(twoCards).toContain(result.missingCard);
  });
});

describe("swapTwoCards", () => {
  it("returns 52 cards", () => {
    const result = swapTwoCards(testStack);
    expect(result.cards).toHaveLength(DECK_SIZE);
  });

  it("swaps exactly two positions", () => {
    const result = swapTwoCards(testStack);
    expect(result.indexA).not.toBe(result.indexB);
    expect(result.cards[result.indexA]).toBe(testStack[result.indexB]);
    expect(result.cards[result.indexB]).toBe(testStack[result.indexA]);
  });

  it("leaves all other positions unchanged", () => {
    const result = swapTwoCards(testStack);
    for (let i = 0; i < DECK_SIZE; i++) {
      if (i !== result.indexA && i !== result.indexB) {
        expect(result.cards[i]).toBe(testStack[i]);
      }
    }
  });

  it("contains the same set of cards as the original", () => {
    const result = swapTwoCards(testStack);
    const sortedOriginal = [...testStack].sort((a, b) =>
      a.image.localeCompare(b.image)
    );
    const sortedResult = [...result.cards].sort((a, b) =>
      a.image.localeCompare(b.image)
    );
    expect(sortedResult).toEqual(sortedOriginal);
  });

  it("works with a two-card array", () => {
    const result = swapTwoCards(twoCards);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toBe(twoCards[1]);
    expect(result.cards[1]).toBe(twoCards[0]);
  });
});

describe("moveCard", () => {
  it("returns 52 cards", () => {
    const result = moveCard(testStack);
    expect(result.cards).toHaveLength(DECK_SIZE);
  });

  it("places the moved card at the reported new index", () => {
    const result = moveCard(testStack);
    expect(result.cards[result.newIndex]).toBe(result.movedCard);
  });

  it("contains the same set of cards as the original", () => {
    const result = moveCard(testStack);
    const sortedOriginal = [...testStack].sort((a, b) =>
      a.image.localeCompare(b.image)
    );
    const sortedResult = [...result.cards].sort((a, b) =>
      a.image.localeCompare(b.image)
    );
    expect(sortedResult).toEqual(sortedOriginal);
  });

  it("places the card at the correct index for edge cases with mocked Math.random", () => {
    // Mock specific edge cases to verify the bump logic and final landing position.
    // Algorithm: fromIndex = floor(r1 * size), toIndex = floor(r2 * (size-1)),
    // then if toIndex >= fromIndex, toIndex += 1. The card is spliced out at
    // fromIndex and inserted at toIndex, so result.newIndex === toIndex.

    // Edge case: first card (fromIndex=0), toIndex=0 bumped to 1
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0) // fromIndex = floor(0 * 52) = 0
      .mockReturnValueOnce(0); // toIndex = floor(0 * 51) = 0, bumped to 1
    let result = moveCard(testStack);
    expect(result.newIndex).toBe(1);
    expect(result.cards[result.newIndex]).toBe(result.movedCard);
    vi.restoreAllMocks();

    // Edge case: last card (fromIndex=51), toIndex=0 stays (0 < 51)
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(51 / DECK_SIZE) // fromIndex = floor(51/52 * 52) = 51
      .mockReturnValueOnce(0); // toIndex = floor(0 * 51) = 0, stays 0
    result = moveCard(testStack);
    expect(result.newIndex).toBe(0);
    expect(result.cards[result.newIndex]).toBe(result.movedCard);
    vi.restoreAllMocks();

    // Edge case: adjacent indices, toIndex=24 stays (24 < 25)
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(25 / DECK_SIZE) // fromIndex = floor(25/52 * 52) = 25
      .mockReturnValueOnce(24 / (DECK_SIZE - 1)); // toIndex = floor(24/51 * 51) = 24, stays 24
    result = moveCard(testStack);
    expect(result.newIndex).toBe(24);
    expect(result.cards[result.newIndex]).toBe(result.movedCard);
    vi.restoreAllMocks();

    // Edge case: toIndex equals fromIndex (gets bumped to 26)
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(25 / DECK_SIZE) // fromIndex = floor(25/52 * 52) = 25
      .mockReturnValueOnce(25 / (DECK_SIZE - 1)); // toIndex = floor(25/51 * 51) = 25, bumped to 26
    result = moveCard(testStack);
    expect(result.newIndex).toBe(26);
    expect(result.cards[result.newIndex]).toBe(result.movedCard);
    vi.restoreAllMocks();
  });

  it("works with a two-card array", () => {
    const result = moveCard(twoCards);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toBe(twoCards[1]);
    expect(result.cards[1]).toBe(twoCards[0]);
  });
});

describe("removeSingleCard guards", () => {
  it("throws when called with an empty array", () => {
    expect(() => removeSingleCard([])).toThrow(
      "removeSingleCard requires at least 2 cards"
    );
  });

  it("throws when called with a single-element array", () => {
    expect(() => removeSingleCard([AceOfHearts])).toThrow(
      "removeSingleCard requires at least 2 cards"
    );
  });
});

describe("swapTwoCards guards", () => {
  it("throws when called with an empty array", () => {
    expect(() => swapTwoCards([])).toThrow(
      "swapTwoCards requires at least 2 cards"
    );
  });

  it("throws when called with a single-element array", () => {
    expect(() => swapTwoCards([AceOfHearts])).toThrow(
      "swapTwoCards requires at least 2 cards"
    );
  });
});

describe("moveCard guards", () => {
  it("throws when called with an empty array", () => {
    expect(() => moveCard([])).toThrow("moveCard requires at least 2 cards");
  });

  it("throws when called with a single-element array", () => {
    expect(() => moveCard([AceOfHearts])).toThrow(
      "moveCard requires at least 2 cards"
    );
  });
});

describe("minimum array sizes", () => {
  it("swapTwoCards produces a valid swap with 2 cards", () => {
    const result = swapTwoCards(twoCards);
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toBe(TwoOfSpades);
    expect(result.cards[1]).toBe(AceOfHearts);
  });

  it("moveCard produces a valid move with 2 cards", () => {
    const result = moveCard(twoCards);
    expect(result.cards).toHaveLength(2);
    expect(result.movedCard).toBeDefined();
    expect(result.cards[result.newIndex]).toBe(result.movedCard);
  });
});

describe("isSpotCheckAnswerCorrect", () => {
  describe("missing mode", () => {
    it("accepts tap on card adjacent before the gap", () => {
      const puzzle = removeSingleCard(testStack);
      const puzzleState = { mode: "missing" as const, puzzle };
      // Card before the gap is at index (missingIndex - 1 + len) % len
      const len = puzzle.cards.length;
      const beforeIdx = (puzzle.missingIndex - 1 + len) % len;
      const card = puzzle.cards[beforeIdx];
      if (!card) {
        throw new Error("Card not found");
      }
      expect(
        isSpotCheckAnswerCorrect(card, beforeIdx, puzzleState, testStack)
      ).toBe(true);
    });

    it("accepts tap on card adjacent after the gap", () => {
      const puzzle = removeSingleCard(testStack);
      const puzzleState = { mode: "missing" as const, puzzle };
      const afterIdx = puzzle.missingIndex % puzzle.cards.length;
      const card = puzzle.cards[afterIdx];
      if (!card) {
        throw new Error("Card not found");
      }
      expect(
        isSpotCheckAnswerCorrect(card, afterIdx, puzzleState, testStack)
      ).toBe(true);
    });

    it("rejects tap on card not adjacent to the gap", () => {
      // Use a deterministic missing index in the middle so we can pick a far-away card
      vi.spyOn(Math, "random").mockReturnValueOnce(25 / DECK_SIZE);
      const puzzle = removeSingleCard(testStack);
      vi.restoreAllMocks();

      const puzzleState = { mode: "missing" as const, puzzle };
      // Pick a card far from index 25
      const farIdx = 0;
      const card = puzzle.cards[farIdx];
      if (!card) {
        throw new Error("Card not found");
      }
      expect(
        isSpotCheckAnswerCorrect(card, farIdx, puzzleState, testStack)
      ).toBe(false);
    });
  });

  describe("swapped mode", () => {
    it("accepts tap on either swapped card", () => {
      const puzzle = swapTwoCards(testStack);
      const puzzleState = { mode: "swapped" as const, puzzle };
      // Tapping the card at indexA (which is the original card from indexB)
      const cardA = puzzle.cards[puzzle.indexA];
      if (!cardA) {
        throw new Error("Card not found");
      }
      expect(
        isSpotCheckAnswerCorrect(cardA, puzzle.indexA, puzzleState, testStack)
      ).toBe(true);

      const cardB = puzzle.cards[puzzle.indexB];
      if (!cardB) {
        throw new Error("Card not found");
      }
      expect(
        isSpotCheckAnswerCorrect(cardB, puzzle.indexB, puzzleState, testStack)
      ).toBe(true);
    });

    it("rejects tap on an unswapped card", () => {
      const puzzle = swapTwoCards(testStack);
      const puzzleState = { mode: "swapped" as const, puzzle };
      // Find an index that wasn't swapped
      let otherIdx = 0;
      while (otherIdx === puzzle.indexA || otherIdx === puzzle.indexB) {
        otherIdx++;
      }
      const card = puzzle.cards[otherIdx];
      if (!card) {
        throw new Error("Card not found");
      }
      expect(
        isSpotCheckAnswerCorrect(card, otherIdx, puzzleState, testStack)
      ).toBe(false);
    });
  });

  describe("moved mode", () => {
    it("accepts tap on the moved card", () => {
      const puzzle = moveCard(testStack);
      const puzzleState = { mode: "moved" as const, puzzle };
      expect(
        isSpotCheckAnswerCorrect(
          puzzle.movedCard,
          puzzle.newIndex,
          puzzleState,
          testStack
        )
      ).toBe(true);
    });

    it("rejects tap on a card that was not moved", () => {
      const puzzle = moveCard(testStack);
      const puzzleState = { mode: "moved" as const, puzzle };
      // Find a card that isn't the moved card
      let otherIdx = 0;
      while (puzzle.cards[otherIdx] === puzzle.movedCard) {
        otherIdx++;
      }
      const card = puzzle.cards[otherIdx];
      if (!card) {
        throw new Error("Card not found");
      }
      expect(
        isSpotCheckAnswerCorrect(card, otherIdx, puzzleState, testStack)
      ).toBe(false);
    });
  });
});
