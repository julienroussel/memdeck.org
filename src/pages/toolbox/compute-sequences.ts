import { DECK_SIZE } from "../../constants";
import type { PlayingCard } from "../../types/playingcard";
import {
  createDeckPosition,
  type DeckPosition,
  type Stack,
} from "../../types/stacks";

type SequenceEntry = {
  position: DeckPosition;
  card: PlayingCard;
};

type SequenceResult = {
  cycleCount: number;
  cycleLength: number;
  cycles: SequenceEntry[][];
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
};

const sanitizeStep = (step: number): number => {
  if (!Number.isFinite(step) || step <= 0) {
    return 1;
  }
  return Math.floor(step);
};

export const computeSequences = (
  stack: Stack,
  step: number
): SequenceResult => {
  const safeStep = sanitizeStep(step);
  const effectiveStep = ((safeStep - 1) % DECK_SIZE) + 1;

  const cycleCount = gcd(DECK_SIZE, effectiveStep);
  const cycleLength = DECK_SIZE / cycleCount;

  const cycles: SequenceEntry[][] = [];

  for (let start = 0; start < cycleCount; start++) {
    const cycle: SequenceEntry[] = [];
    let index = start;
    for (let j = 0; j < cycleLength; j++) {
      cycle.push({
        position: createDeckPosition(index + 1),
        card: stack[index],
      });
      index = (index + effectiveStep) % DECK_SIZE;
    }
    cycles.push(cycle);
  }

  return { cycleCount, cycleLength, cycles };
};
