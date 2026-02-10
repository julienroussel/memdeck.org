import { useEffect, useRef } from "react";
import type { Stack } from "../types/stacks";

export type ResetGameAction = {
  type: "RESET_GAME";
  payload: { stackOrder: Stack; timerDuration: number };
};

/**
 * Resets the game when the selected stack changes.
 * Tracks the previous stack order via a ref and dispatches RESET_GAME
 * only when the stack actually changes, avoiding unnecessary resets
 * on re-renders.
 *
 * @param stackOrder - The current stack order
 * @param timerDuration - The current timer duration
 * @param dispatch - Dispatch function that accepts a RESET_GAME action
 */
export const useResetGameOnStackChange = (
  stackOrder: Stack,
  timerDuration: number,
  dispatch: (action: ResetGameAction) => void
): void => {
  const prevStackOrderRef = useRef(stackOrder);
  useEffect(() => {
    if (prevStackOrderRef.current !== stackOrder) {
      prevStackOrderRef.current = stackOrder;
      dispatch({
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration },
      });
    }
  }, [stackOrder, timerDuration, dispatch]);
};
