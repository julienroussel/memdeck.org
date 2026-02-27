import { timerReducerCases } from "../../hooks/use-game-timer";
import type { ResetGameAction } from "../../hooks/use-reset-game-on-stack-change";
import type { Stack } from "../../types/stacks";
import {
  type AcaanScenario,
  calculateCutDepth,
  generateAcaanScenario,
} from "../../utils/acaan-scenario";

// --- Types ---

export type GameState = {
  scenario: AcaanScenario;
  successes: number;
  fails: number;
  timeRemaining: number;
  timerDuration: number;
};

type TimeoutAction = {
  type: "TIMEOUT";
  payload: { newScenario: AcaanScenario };
};

export type GameAction =
  | { type: "CORRECT_ANSWER"; payload: { newScenario: AcaanScenario } }
  | { type: "WRONG_ANSWER" }
  | TimeoutAction
  | { type: "REVEAL_ANSWER"; payload: { newScenario: AcaanScenario } }
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } }
  | ResetGameAction;

// --- Pure Functions ---

/** Extracts the current cut depth from a scenario, avoiding repeated calculateCutDepth calls. */
export const getCurrentCutDepth = (scenario: AcaanScenario): number =>
  calculateCutDepth(scenario.cardPosition, scenario.targetPosition);

export const formatCutDepthMessage = (
  cardPosition: number,
  targetPosition: number,
  cutDepth: number
): string => {
  const cutDepthText = cutDepth === 0 ? "0 (no cut needed)" : String(cutDepth);
  return `Position ${cardPosition} → ${targetPosition}, cut depth: ${cutDepthText}`;
};

export const createInitialState = (
  stackOrder: Stack,
  timerDuration: number
): GameState => ({
  scenario: generateAcaanScenario(stackOrder),
  successes: 0,
  fails: 0,
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
        scenario: action.payload.newScenario,
        timeRemaining: state.timerDuration,
      };
    // Note: WRONG_ANSWER intentionally does NOT reset the timer or advance to next scenario.
    // This allows users to retry the same question until they get it right or time runs out.
    // Retry-until-correct aligns ACAAN with flashcard mode for consistent session tracking.
    case "WRONG_ANSWER":
      return {
        ...state,
        fails: state.fails + 1,
      };
    case "TIMEOUT":
    case "REVEAL_ANSWER":
      return {
        ...state,
        fails: state.fails + 1,
        scenario: action.payload.newScenario,
        timeRemaining: state.timerDuration,
      };
    case "TICK":
      return timerReducerCases.TICK(state);
    case "RESET_TIMER":
      return timerReducerCases.RESET_TIMER(state, action.payload.duration);
    case "RESET_GAME":
      return createInitialState(
        action.payload.stackOrder,
        action.payload.timerDuration
      );
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
};
