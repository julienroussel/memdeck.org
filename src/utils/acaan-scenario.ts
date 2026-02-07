import { DECK_SIZE } from "../constants";
import type { PlayingCard } from "../types/playingcard";
import type { DeckPosition, Stack } from "../types/stacks";

/**
 * Represents an ACAAN (Any Card At Any Number) training scenario.
 * @property card - The playing card to be placed
 * @property cardPosition - The card's actual position in the stack (1-52)
 * @property targetPosition - The target position where the card should appear (1-52)
 */
export type AcaanScenario = {
  /** The playing card to be placed */
  card: PlayingCard;
  /** The card's actual position in the stack (1-52) */
  cardPosition: DeckPosition;
  /** The target position where the card should appear (1-52) */
  targetPosition: DeckPosition;
};

/**
 * Generates a random target position (1-52) that is different from the excluded position.
 */
export const getRandomTargetPosition = (excludePosition: number): number => {
  let position: number;
  do {
    position = Math.floor(Math.random() * DECK_SIZE) + 1;
  } while (position === excludePosition);
  return position;
};

/**
 * Generates a random ACAAN scenario with a card and target position.
 * The target position is always different from the card's actual position in the stack.
 */
export const generateAcaanScenario = (stack: Stack): AcaanScenario => {
  const randomIndex = Math.floor(Math.random() * DECK_SIZE);
  const cardPosition = randomIndex + 1;
  const card = stack[randomIndex] ?? stack[0];
  const targetPosition = getRandomTargetPosition(cardPosition);

  return {
    card,
    cardPosition,
    targetPosition,
  };
};

/**
 * Calculates the cut depth needed to move a card from its current position to a target position.
 * The cut depth is the number of cards to cut from the top of the deck.
 *
 * Formula: (cardPosition - targetPosition + 52) % 52
 * - Result of 0 means no cut is needed (card is already at target position)
 * - Handles wraparound cases where target > cardPosition
 *
 * @param cardPosition - The card's current position in the stack (1-52)
 * @param targetPosition - The target position where the card should appear (1-52)
 * @returns The cut depth (0-51), where 0 means no cut needed
 */
export const calculateCutDepth = (
  cardPosition: number,
  targetPosition: number
): number => {
  return (cardPosition - targetPosition + DECK_SIZE) % DECK_SIZE;
};
