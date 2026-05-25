import { timerReducerCases } from "../../hooks/use-game-timer";
import type { PlayingCard } from "../../types/playingcard";
import type { SpotCheckMode } from "../../types/spot-check";
import { isFullDeck, type StackLimits } from "../../types/stack-limits";
import type { Stack } from "../../types/stacks";
import {
  moveCard,
  type PuzzleState,
  removeSingleCard,
  swapTwoCards,
} from "./utils";

// --- State ---

export type GameState = {
  successes: number;
  fails: number;
  puzzleState: PuzzleState;
  timeRemaining: number;
  timerDuration: number;
};

// --- Actions ---

export type AdvancePayload = {
  newPuzzle: PuzzleState;
};

export type GameAction =
  | { type: "CORRECT_ANSWER"; payload: AdvancePayload }
  | { type: "WRONG_ANSWER" }
  | { type: "REVEAL_ANSWER"; payload: AdvancePayload }
  | { type: "TIMEOUT"; payload: AdvancePayload }
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } }
  | {
      type: "RESET_GAME";
      payload: {
        cards: readonly PlayingCard[];
        timerDuration: number;
        spotCheckMode: SpotCheckMode;
      };
    };

// --- Helpers ---

export const getCardsForPuzzle = (
  stackOrder: Stack,
  limits: StackLimits
): readonly PlayingCard[] => {
  if (isFullDeck(limits)) {
    return stackOrder;
  }
  return stackOrder.slice(limits.start - 1, limits.end);
};

export const generatePuzzle = (
  cards: readonly PlayingCard[],
  mode: SpotCheckMode
): PuzzleState => {
  switch (mode) {
    case "missing":
      return { mode: "missing", puzzle: removeSingleCard(cards) };
    case "swapped":
      return { mode: "swapped", puzzle: swapTwoCards(cards) };
    case "moved":
      return { mode: "moved", puzzle: moveCard(cards) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown spot check mode: ${_exhaustive}`);
    }
  }
};

export const createInitialState = (
  cards: readonly PlayingCard[],
  timerDuration: number,
  mode: SpotCheckMode
): GameState => ({
  successes: 0,
  fails: 0,
  puzzleState: generatePuzzle(cards, mode),
  timeRemaining: timerDuration,
  timerDuration,
});

// --- Reducer ---

export const gameReducer = (
  state: GameState,
  action: GameAction
): GameState => {
  switch (action.type) {
    case "CORRECT_ANSWER":
      return {
        ...state,
        successes: state.successes + 1,
        puzzleState: action.payload.newPuzzle,
        timeRemaining: state.timerDuration,
      };
    case "WRONG_ANSWER":
      return {
        ...state,
        fails: state.fails + 1,
      };
    case "REVEAL_ANSWER":
      return {
        ...state,
        fails: state.fails + 1,
        puzzleState: action.payload.newPuzzle,
        timeRemaining: state.timerDuration,
      };
    case "TIMEOUT":
      return {
        ...state,
        fails: state.fails + 1,
        puzzleState: action.payload.newPuzzle,
        timeRemaining: state.timerDuration,
      };
    case "TICK":
      return timerReducerCases.TICK(state);
    case "RESET_TIMER":
      return timerReducerCases.RESET_TIMER(state, action.payload.duration);
    case "RESET_GAME":
      return createInitialState(
        action.payload.cards,
        action.payload.timerDuration,
        action.payload.spotCheckMode
      );
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unhandled action type: ${JSON.stringify(_exhaustive)}`);
    }
  }
};
