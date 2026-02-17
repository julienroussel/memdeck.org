import { DECK_SIZE } from "../../constants";
import type { PlayingCard } from "../../types/playingcard";
import type { Stack } from "../../types/stacks";

export type FaroType = "in" | "out";

const HALF = DECK_SIZE / 2;

/**
 * Applies a single faro shuffle to an array of 52 cards.
 *
 * Out-faro: top card stays on top. Top half goes to even positions (0,2,4...),
 * bottom half goes to odd positions (1,3,5...).
 *
 * In-faro: bottom half's first card goes on top. Bottom half goes to even positions,
 * top half goes to odd positions.
 */
const singleFaro = (
  cards: readonly PlayingCard[],
  type: FaroType
): PlayingCard[] => {
  const top = cards.slice(0, HALF);
  const bottom = cards.slice(HALF);

  return top.flatMap((card, i): [PlayingCard, PlayingCard] =>
    type === "out" ? [card, bottom[i]] : [bottom[i], card]
  );
};

/**
 * Applies N faro shuffles of the given type to the cards array.
 *
 * Key properties:
 * - 8 out-faros restore a 52-card deck to its original order
 * - 52 in-faros restore a 52-card deck to its original order
 */
export const applyFaro = (
  cards: Stack,
  type: FaroType,
  count: number
): PlayingCard[] => {
  if (!Number.isFinite(count) || count < 0) {
    return [...cards];
  }
  const n = Math.floor(count);
  let current: PlayingCard[] = [...cards];
  for (let i = 0; i < n; i++) {
    current = singleFaro(current, type);
  }
  return current;
};
