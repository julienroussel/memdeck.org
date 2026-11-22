import type { StackLimits } from "../../types/stack-limits";
import {
  DEFAULT_STACK_LIMITS,
  getRangeSize,
  isSameLimits,
} from "../../types/stack-limits";
import type { DeckPosition } from "../../types/stacks";
import { isSamePositions } from "../../utils/focus-positions";

/**
 * Where Flashcard draws its questions from: the global stack range, or a
 * focus list typed in Flashcard's settings, which replaces the range while it
 * is set. Both kinds name a finite set of positions, so a session can later
 * deal each one once (#822).
 */
export type FlashcardPool =
  | { kind: "range"; limits: StackLimits }
  | { kind: "focus"; positions: readonly DeckPosition[] };

export const DEFAULT_FLASHCARD_POOL: FlashcardPool = {
  kind: "range",
  limits: DEFAULT_STACK_LIMITS,
};

/** Number of positions a question can be drawn from. */
export const getPoolSize = (pool: FlashcardPool): number =>
  pool.kind === "focus" ? pool.positions.length : getRangeSize(pool.limits);

/** Compares two pools by content, so a re-created but equal pool does not reset the game. */
export const isSamePool = (a: FlashcardPool, b: FlashcardPool): boolean => {
  if (a.kind === "range" && b.kind === "range") {
    return isSameLimits(a.limits, b.limits);
  }
  if (a.kind === "focus" && b.kind === "focus") {
    return isSamePositions(a.positions, b.positions);
  }
  return false;
};
