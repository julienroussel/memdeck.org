import { describe, expect, it, vi } from "vitest";
import { DECK_SIZE } from "../../constants";
import { stacks } from "../../types/stacks";
import { moveCard, removeSingleCard, swapTwoCards } from "./utils";

const testStack = stacks.mnemonica.order;

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

  it("places the card at a different index than its original position for edge cases", () => {
    // Mock specific edge cases instead of relying on random iterations.
    // The algorithm guarantees toIndex !== fromIndex by computing
    // random(0..50), then incrementing if >= fromIndex.

    // Edge case: first card (fromIndex=0)
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0) // fromIndex = 0
      .mockReturnValueOnce(0); // toIndex = 0, bumped to 1
    let result = moveCard(testStack);
    expect(result.newIndex).not.toBe(testStack.indexOf(result.movedCard));
    vi.restoreAllMocks();

    // Edge case: last card (fromIndex=51)
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(51 / DECK_SIZE) // fromIndex = 51
      .mockReturnValueOnce(0); // toIndex = 0
    result = moveCard(testStack);
    expect(result.newIndex).not.toBe(testStack.indexOf(result.movedCard));
    vi.restoreAllMocks();

    // Edge case: adjacent indices (fromIndex=25, toIndex=24)
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(25 / DECK_SIZE) // fromIndex = 25
      .mockReturnValueOnce(24 / (DECK_SIZE - 1)); // toIndex = 24
    result = moveCard(testStack);
    expect(result.newIndex).not.toBe(testStack.indexOf(result.movedCard));
    vi.restoreAllMocks();

    // Edge case: fromIndex=25, toIndex would equal fromIndex (gets bumped)
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(25 / DECK_SIZE) // fromIndex = 25
      .mockReturnValueOnce(25 / (DECK_SIZE - 1)); // toIndex = 25, bumped to 26
    result = moveCard(testStack);
    expect(result.newIndex).not.toBe(testStack.indexOf(result.movedCard));
    vi.restoreAllMocks();
  });
});
