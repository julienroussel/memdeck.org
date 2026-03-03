import { DECK_SIZE } from "../constants";
import type { NeighborDirection } from "../types/flashcard";
import type { PlayingCard } from "../types/playingcard";
import {
  createDeckPosition,
  getCardAt,
  type PlayingCardPosition,
  type Stack,
} from "../types/stacks";

export type ResolvedDirection = "before" | "after";

/** Resolves a neighbor direction, converting "random" to a concrete direction. */
export const resolveDirection = (
  direction: NeighborDirection
): ResolvedDirection => {
  if (direction === "random") {
    return Math.random() < 0.5 ? "before" : "after";
  }
  return direction;
};

/**
 * Returns the neighboring card in the stack with wrap-around.
 * "before" returns the card at position - 1 (wrapping 1 → 52).
 * "after" returns the card at position + 1 (wrapping 52 → 1).
 */
export const getNeighborCard = (
  stack: Stack,
  questionCard: PlayingCardPosition,
  resolvedDirection: ResolvedDirection
): PlayingCardPosition => {
  const currentIndex = questionCard.index;
  const offset = resolvedDirection === "before" ? -1 : 1;
  // Convert 1-based index to 0-based, apply offset with wrap-around, convert back
  const neighborZeroBased = (currentIndex - 1 + offset + DECK_SIZE) % DECK_SIZE;
  const neighborIndex = createDeckPosition(neighborZeroBased + 1);
  const neighborCard: PlayingCard = getCardAt(stack, neighborZeroBased);
  return { index: neighborIndex, card: neighborCard };
};
