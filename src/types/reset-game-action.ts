import type { Stack } from "./stacks";

/**
 * Shared shape for `RESET_GAME` action payloads across game-mode reducers.
 *
 * Every game mode (flashcard, ACAAN, etc.) needs at least the stack order to
 * draw cards from and a timer duration to seed the countdown. Mode-specific
 * fields (e.g. `limits`, `flashcardMode`, `neighborDirection`) are intersected
 * on top of this base by each reducer.
 */
export type BaseResetGameAction = {
  stackOrder: Stack;
  timerDuration: number;
};
