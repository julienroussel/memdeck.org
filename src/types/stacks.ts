import { PlayingCard } from './playingcard';
import { aronson } from './stacks/aronson';
import { memorandum } from './stacks/memorandum';
import { mnemonica } from './stacks/mnemonica';
import { particle } from './stacks/particle';
import { redford } from './stacks/redford';

// from https://mstn.github.io/2018/06/08/fixed-size-arrays-in-typescript/
type FixedSizeArray<N extends number, T> = N extends 0
  ? never[]
  : {
      0: T;
      length: N;
    } & ReadonlyArray<T>;

export type Stack = FixedSizeArray<52, PlayingCard>;
type MemDeck = {
  name: string;
  order: Stack;
};

type MemDecks = {
  [key: string]: MemDeck;
};

export const stacks: MemDecks = {
  mnemonica,
  aronson,
  memorandum,
  redford,
  particle,
};

export type PlayingCardPosition = {
  index: number;
  card: Stack[number];
};

export const getRandomPlayingCard = (stack: Stack): PlayingCardPosition => {
  const randomIndex = Math.floor(Math.random() * 52);
  return {
    index: randomIndex + 1,
    card: stack[randomIndex] ?? stack[0],
  };
};

export const getUniqueRandomCard = (
  stack: Stack,
  choices: PlayingCardPosition[],
): PlayingCardPosition => {
  const randomCard = getRandomPlayingCard(stack);
  return choices.some((c) => c.index === randomCard.index)
    ? getUniqueRandomCard(stack, choices)
    : randomCard;
};
