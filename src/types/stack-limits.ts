import { DECK_SIZE } from "../constants";
import {
  createDeckPosition,
  type DeckPosition,
  type StackKey,
  stacks,
} from "./stacks";

const VALID_STACK_KEYS: ReadonlySet<string> = new Set(Object.keys(stacks));

export type StackLimits = { start: DeckPosition; end: DeckPosition };

export type StackLimitsRecord = Partial<
  Record<StackKey, { start: number; end: number }>
>;

export const DEFAULT_STACK_LIMITS: StackLimits = {
  start: createDeckPosition(1),
  end: createDeckPosition(DECK_SIZE),
};

export const getRangeSize = (limits: StackLimits): number =>
  limits.end - limits.start + 1;

export const isFullDeck = (limits: StackLimits): boolean =>
  limits.start === 1 && limits.end === DECK_SIZE;

/** Type guard for localStorage validation of stack limits records */
export const isStackLimitsRecord = (
  value: unknown
): value is Partial<Record<StackKey, { start: number; end: number }>> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  // System boundary: value is validated structurally below; cast is needed because
  // Object.entries() requires Record<string, unknown> but value is typed as object.
  const record = value as Record<string, unknown>;
  return Object.entries(record).every(([key, entry]) => {
    if (!VALID_STACK_KEYS.has(key)) {
      return false;
    }
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    return (
      "start" in entry &&
      "end" in entry &&
      typeof entry.start === "number" &&
      typeof entry.end === "number" &&
      Number.isInteger(entry.start) &&
      Number.isInteger(entry.end) &&
      entry.start >= 1 &&
      entry.start <= DECK_SIZE &&
      entry.end >= 1 &&
      entry.end <= DECK_SIZE &&
      entry.start <= entry.end
    );
  });
};
