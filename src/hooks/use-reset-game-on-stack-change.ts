import { useEffect, useRef } from "react";
import type { FlashcardMode, NeighborDirection } from "../types/flashcard";
import type { StackLimits } from "../types/stack-limits";
import type { Stack } from "../types/stacks";

export type InitialStateConfig = {
  stackOrder: Stack;
  timerDuration: number;
  limits?: StackLimits;
} & (
  | { flashcardMode: "neighbor"; neighborDirection: NeighborDirection }
  | { flashcardMode?: Exclude<FlashcardMode, "neighbor"> }
);

export type ResetGameAction = {
  type: "RESET_GAME";
  payload: InitialStateConfig;
};

/**
 * @deprecated Only used by ACAAN. Flashcard and Spot Check use inline change
 * detection instead (the "store previous props" pattern) to avoid useEffect flicker
 * and to support stack limits. Do not use for new game modes — prefer the inline pattern.
 *
 * Resets the game when the selected stack changes.
 * Tracks the previous stack order via a ref and dispatches RESET_GAME
 * only when the stack actually changes, avoiding unnecessary resets
 * on re-renders.
 *
 * @param stackOrder - The current stack order
 * @param timerDuration - The current timer duration
 * @param dispatch - Dispatch function that accepts a RESET_GAME action
 * @param extraPayload - Optional extra fields to include in the RESET_GAME payload
 */
export const useResetGameOnStackChange = (
  stackOrder: Stack,
  timerDuration: number,
  dispatch: (action: ResetGameAction) => void,
  extraPayload?: {
    flashcardMode: FlashcardMode;
    neighborDirection: NeighborDirection;
  }
): void => {
  const prevStackOrderRef = useRef(stackOrder);
  const extraPayloadRef = useRef(extraPayload);
  extraPayloadRef.current = extraPayload;

  useEffect(() => {
    if (prevStackOrderRef.current !== stackOrder) {
      prevStackOrderRef.current = stackOrder;
      const extra = extraPayloadRef.current;
      if (extra?.flashcardMode === "neighbor") {
        dispatch({
          type: "RESET_GAME",
          payload: {
            stackOrder,
            timerDuration,
            flashcardMode: extra.flashcardMode,
            neighborDirection: extra.neighborDirection,
          },
        });
      } else {
        dispatch({
          type: "RESET_GAME",
          payload: {
            stackOrder,
            timerDuration,
            flashcardMode: extra?.flashcardMode,
          },
        });
      }
    }
  }, [stackOrder, timerDuration, dispatch]);
};
