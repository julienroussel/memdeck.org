import type { PlayingCard } from "../../types/playingcard";

/** Discriminated union representing the current puzzle variant */
export type PuzzleState =
  | { mode: "missing"; puzzle: MissingCardPuzzle }
  | { mode: "swapped"; puzzle: SwappedCardsPuzzle }
  | { mode: "moved"; puzzle: MovedCardPuzzle };

/** Result of removing a single card from the deck */
export type MissingCardPuzzle = {
  /** Array with one card removed */
  cards: PlayingCard[];
  /** The card that was removed */
  missingCard: PlayingCard;
  /** 0-based index where the card was removed from */
  missingIndex: number;
};

/** Result of swapping two cards in the deck */
export type SwappedCardsPuzzle = {
  /** Array with two cards swapped */
  cards: PlayingCard[];
  /** 0-based index of the first swapped card */
  indexA: number;
  /** 0-based index of the second swapped card */
  indexB: number;
};

/** Result of moving one card to a different position */
export type MovedCardPuzzle = {
  /** Array with one card moved */
  cards: PlayingCard[];
  /** The card that was moved */
  movedCard: PlayingCard;
  /** 0-based index where the card ended up */
  newIndex: number;
};

/**
 * Removes a single random card from the given cards.
 * Returns the modified array and metadata about the removed card.
 */
export const removeSingleCard = (
  cards: readonly PlayingCard[]
): MissingCardPuzzle => {
  if (cards.length < 2) {
    throw new Error("removeSingleCard requires at least 2 cards");
  }
  const missingIndex = Math.floor(Math.random() * cards.length);
  const missingCard = cards[missingIndex];
  if (!missingCard) {
    throw new Error(`Invalid index: ${missingIndex}`);
  }
  const result = [
    ...cards.slice(0, missingIndex),
    ...cards.slice(missingIndex + 1),
  ];
  return { cards: result, missingCard, missingIndex };
};

/**
 * Swaps two random cards in the given cards.
 * Ensures the two indices are different.
 */
export const swapTwoCards = (
  cards: readonly PlayingCard[]
): SwappedCardsPuzzle => {
  if (cards.length < 2) {
    throw new Error("swapTwoCards requires at least 2 cards");
  }
  const size = cards.length;
  const indexA = Math.floor(Math.random() * size);
  let indexB = Math.floor(Math.random() * (size - 1));
  if (indexB >= indexA) {
    indexB += 1;
  }

  const result = [...cards];
  const cardA = result[indexA];
  const cardB = result[indexB];
  if (!(cardA && cardB)) {
    throw new Error(`Invalid indices: ${indexA}, ${indexB}`);
  }
  result[indexA] = cardB;
  result[indexB] = cardA;

  return { cards: result, indexA, indexB };
};

/**
 * Removes one card and re-inserts it at a different random position.
 * Ensures the card moves to a genuinely different position.
 */
export const moveCard = (cards: readonly PlayingCard[]): MovedCardPuzzle => {
  if (cards.length < 2) {
    throw new Error("moveCard requires at least 2 cards");
  }
  const size = cards.length;
  const fromIndex = Math.floor(Math.random() * size);
  let toIndex = Math.floor(Math.random() * (size - 1));
  if (toIndex >= fromIndex) {
    toIndex += 1;
  }

  const movedCard = cards[fromIndex];
  if (!movedCard) {
    throw new Error(`Invalid index: ${fromIndex}`);
  }

  // Remove the card, then insert at new position
  const result = [...cards];
  result.splice(fromIndex, 1);
  result.splice(toIndex, 0, movedCard);

  return { cards: result, movedCard, newIndex: toIndex };
};

/**
 * Determines whether the user's tap is a correct answer for the current puzzle.
 *
 * @param card - The card object the user tapped
 * @param index - The 0-based display index the user tapped
 * @param puzzleState - The current puzzle variant and its data
 * @param referenceCards - The original (unmodified) card array for comparison
 */
export const isSpotCheckAnswerCorrect = (
  card: PlayingCard,
  index: number,
  puzzleState: PuzzleState,
  referenceCards: readonly PlayingCard[]
): boolean => {
  switch (puzzleState.mode) {
    case "missing": {
      // In the array with one card removed, the gap is at missingIndex.
      // Tapping the card just before or just after the gap is correct.
      // The deck wraps: if the gap is at position 0, the last card
      // is "before" it; if at the last position, index 0 is "after".
      const gap = puzzleState.puzzle.missingIndex;
      const len = puzzleState.puzzle.cards.length;
      const before = (gap - 1 + len) % len;
      const after = gap % len;
      return index === before || index === after;
    }
    case "swapped": {
      // Either swapped card is correct — compare against the reference cards
      return (
        card === referenceCards[puzzleState.puzzle.indexA] ||
        card === referenceCards[puzzleState.puzzle.indexB]
      );
    }
    case "moved":
      return card === puzzleState.puzzle.movedCard;
    default: {
      const _exhaustive: never = puzzleState;
      throw new Error(`Unknown puzzle mode: ${_exhaustive}`);
    }
  }
};
