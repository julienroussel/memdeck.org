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

/** A 1-based position in a 52-card deck (1-52), branded to prevent arbitrary numbers */
export type DeckPosition = number & { readonly __brand: "DeckPosition" };

/**
 * Creates a validated DeckPosition from a number.
 * Throws if the number is not an integer in the range 1-52.
 *
 * @param n - The number to convert to a DeckPosition
 * @returns A branded DeckPosition value
 * @throws {Error} If n is not an integer or is outside the 1-52 range
 */
export const createDeckPosition = (n: number): DeckPosition => {
  if (!Number.isInteger(n) || n < 1 || n > DECK_SIZE) {
    throw new Error(`Invalid deck position: ${n}. Must be integer 1-52.`);
  }
  return n as DeckPosition;
};

/**
 * Safely retrieves a card from a stack by 0-based index.
 * Throws if the index is out of the valid range (0-51).
 *
 * @param stack - The 52-card stack to index into
 * @param index - 0-based index (0-51)
 * @returns The playing card at the given index
 * @throws {Error} If index is not in the range 0-51
 */
export const getCardAt = (stack: Stack, index: number): PlayingCard => {
  const card = stack[index];
  if (!card) {
    throw new Error(`Invalid stack index: ${index}. Must be 0-51.`);
  }
  return card;
};

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
    index: createDeckPosition(randomIndex + 1),
    card: getCardAt(stack, randomIndex),
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
    const index = createDeckPosition(i + 1);
    if (!existingIndices.has(index)) {
      return { index, card: getCardAt(stack, i) };
    }
  }

  throw new Error(
    `Unable to find unique card - all ${DECK_SIZE} cards already selected`
  );
};
