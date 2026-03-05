import { DECK_SIZE } from "../../constants";
import type { PlayingCard } from "../../types/playingcard";
import type { Stack } from "../../types/stacks";

/** Result of removing a single card from the deck */
export type MissingCardPuzzle = {
  /** 51-card array with one card removed */
  cards: PlayingCard[];
  /** The card that was removed */
  missingCard: PlayingCard;
  /** 0-based index where the card was removed from */
  missingIndex: number;
};

/** Result of swapping two cards in the deck */
export type SwappedCardsPuzzle = {
  /** 52-card array with two cards swapped */
  cards: PlayingCard[];
  /** 0-based index of the first swapped card */
  indexA: number;
  /** 0-based index of the second swapped card */
  indexB: number;
};

/** Result of moving one card to a different position */
export type MovedCardPuzzle = {
  /** 52-card array with one card moved */
  cards: PlayingCard[];
  /** The card that was moved */
  movedCard: PlayingCard;
  /** 0-based index where the card ended up */
  newIndex: number;
};

/**
 * Removes a single random card from the stack.
 * Returns the modified array and metadata about the removed card.
 */
export const removeSingleCard = (stack: Stack): MissingCardPuzzle => {
  const missingIndex = Math.floor(Math.random() * DECK_SIZE);
  const missingCard = stack[missingIndex];
  if (!missingCard) {
    throw new Error(`Invalid index: ${missingIndex}`);
  }
  const cards = [
    ...stack.slice(0, missingIndex),
    ...stack.slice(missingIndex + 1),
  ];
  return { cards, missingCard, missingIndex };
};

/**
 * Swaps two random cards in the stack.
 * Ensures the two indices are different.
 */
export const swapTwoCards = (stack: Stack): SwappedCardsPuzzle => {
  const indexA = Math.floor(Math.random() * DECK_SIZE);
  let indexB = Math.floor(Math.random() * (DECK_SIZE - 1));
  if (indexB >= indexA) {
    indexB += 1;
  }

  const cards = [...stack];
  const cardA = cards[indexA];
  const cardB = cards[indexB];
  if (!(cardA && cardB)) {
    throw new Error(`Invalid indices: ${indexA}, ${indexB}`);
  }
  cards[indexA] = cardB;
  cards[indexB] = cardA;

  return { cards, indexA, indexB };
};

/**
 * Removes one card and re-inserts it at a different random position.
 * Ensures the card moves to a genuinely different position.
 */
export const moveCard = (stack: Stack): MovedCardPuzzle => {
  const fromIndex = Math.floor(Math.random() * DECK_SIZE);
  let toIndex = Math.floor(Math.random() * (DECK_SIZE - 1));
  if (toIndex >= fromIndex) {
    toIndex += 1;
  }

  const movedCard = stack[fromIndex];
  if (!movedCard) {
    throw new Error(`Invalid index: ${fromIndex}`);
  }

  // Remove the card, then insert at new position
  const cards = [...stack];
  cards.splice(fromIndex, 1);
  cards.splice(toIndex, 0, movedCard);

  return { cards, movedCard, newIndex: toIndex };
};
