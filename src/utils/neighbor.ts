import type { NeighborDirection } from "../types/flashcard";
import type { PlayingCard } from "../types/playingcard";
import type { StackLimits } from "../types/stack-limits";
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
 * Returns the neighboring card within a range with wrap-around at range boundaries.
 * "before" returns the card at position - 1 (wrapping range start → range end).
 * "after" returns the card at position + 1 (wrapping range end → range start).
 */
export const getNeighborCard = (
  stack: Stack,
  questionCard: PlayingCardPosition,
  resolvedDirection: ResolvedDirection,
  limits: StackLimits
): PlayingCardPosition => {
  const rangeSize = limits.end - limits.start + 1;
  const currentIndex = questionCard.index;
  if (currentIndex < limits.start || currentIndex > limits.end) {
    throw new Error(
      `questionCard index ${currentIndex} is outside limits ${limits.start}-${limits.end}`
    );
  }
  const offset = resolvedDirection === "before" ? -1 : 1;
  // Convert to 0-based offset within range, apply wrap-around, convert back
  const positionInRange = currentIndex - limits.start;
  const neighborInRange = (positionInRange + offset + rangeSize) % rangeSize;
  const neighborZeroBased = limits.start - 1 + neighborInRange;
  const neighborIndex = createDeckPosition(neighborZeroBased + 1);
  const neighborCard: PlayingCard = getCardAt(stack, neighborZeroBased);
  return { index: neighborIndex, card: neighborCard };
};
