import { DECK_SIZE, MAX_RANDOM_ATTEMPTS } from "../constants";
import type { PlayingCard } from "./playingcard";
import { aronson } from "./stacks/aronson";
import { memorandum } from "./stacks/memorandum";
import { mnemonica } from "./stacks/mnemonica";
import { particle } from "./stacks/particle";
import { redford } from "./stacks/redford";

/**
 * Approximation of a fixed-size array type. Asserts `length: N` and that index 0 exists,
 * but does not structurally prevent arrays of different lengths at runtime.
 * Compile-time safety relies on stack definitions using `as const` tuples.
 * @see https://mstn.github.io/2018/06/08/fixed-size-arrays-in-typescript/
 */
type FixedSizeArray<N extends number, T> = N extends 0
  ? never[]
  : {
      0: T;
      length: N;
    } & readonly T[];

export type Stack = FixedSizeArray<52, PlayingCard>;

export const stacks = {
  mnemonica,
  aronson,
  memorandum,
  redford,
  particle,
} as const;

export type StackKey = keyof typeof stacks;
export type StackValue = (typeof stacks)[StackKey];

/** A 1-based position in a 52-card deck (1-52) */
export type DeckPosition = number;

/**
 * Represents a playing card's position within a memorized stack.
 * @property index - 1-based position in the stack (1-52)
 * @property card - The playing card at this position
 */
export type PlayingCardPosition = {
  /** 1-based position in the stack (1-52) */
  index: DeckPosition;
  /** The playing card at this position */
  card: PlayingCard;
};

export const getRandomPlayingCard = (stack: Stack): PlayingCardPosition => {
  const randomIndex = Math.floor(Math.random() * DECK_SIZE);
  return {
    index: randomIndex + 1,
    card: stack[randomIndex] ?? stack[0],
  };
};

export const getUniqueRandomCard = (
  stack: Stack,
  existingChoices: PlayingCardPosition[]
): PlayingCardPosition => {
  const existingIndices = new Set(existingChoices.map((c) => c.index));

  // Try random selection before falling back to linear search
  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt++) {
    const randomCard = getRandomPlayingCard(stack);
    if (!existingIndices.has(randomCard.index)) {
      return randomCard;
    }
  }

  // Fallback: linear search for guaranteed unique card
  for (let i = 0; i < DECK_SIZE; i++) {
    const index = i + 1;
    if (!existingIndices.has(index)) {
      return { index, card: stack[i] ?? stack[0] };
    }
  }

  throw new Error(
    `Unable to find unique card - all ${DECK_SIZE} cards already selected`
  );
};
