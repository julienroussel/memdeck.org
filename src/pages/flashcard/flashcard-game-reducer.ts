import { timerReducerCases } from "../../hooks/use-game-timer";
import type { ResetGameAction } from "../../hooks/use-reset-game-on-stack-change";
import type { PlayingCard } from "../../types/playingcard";
import { shuffle } from "../../types/shuffle";
import {
  getRandomPlayingCard,
  type PlayingCardPosition,
  type Stack,
} from "../../types/stacks";
import { isPlayingCard } from "../../types/typeguards";
import { generateUniqueCardChoices } from "../../utils/card-selection";
import type { DisplayMode } from "./utils";

// --- Types ---

export type GameState = {
  successes: number;
  fails: number;
  card: PlayingCardPosition;
  choices: PlayingCardPosition[];
  display: DisplayMode;
  timeRemaining: number;
  timerDuration: number;
};

type TimeoutAction = {
  type: "TIMEOUT";
  payload: {
    newCard: PlayingCardPosition;
    newChoices: PlayingCardPosition[];
    newDisplay: DisplayMode;
  };
};

export type GameAction =
  | {
      type: "CORRECT_ANSWER";
      payload: {
        newCard: PlayingCardPosition;
        newChoices: PlayingCardPosition[];
        newDisplay: DisplayMode;
      };
    }
  | { type: "WRONG_ANSWER" }
  | TimeoutAction
  | {
      type: "REVEAL_ANSWER";
      payload: {
        newCard: PlayingCardPosition;
        newChoices: PlayingCardPosition[];
        newDisplay: DisplayMode;
      };
    }
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } }
  | ResetGameAction;

// --- Pure Functions ---

export const generateNewCardAndChoices = (
  stackOrder: Stack
): { card: PlayingCardPosition; choices: PlayingCardPosition[] } => {
  const newCard = getRandomPlayingCard(stackOrder);
  const newChoices = shuffle(generateUniqueCardChoices(stackOrder, [newCard]));
  return { card: newCard, choices: newChoices };
};

export const isCorrectAnswer = (
  item: PlayingCard | number,
  card: PlayingCardPosition
): boolean =>
  isPlayingCard(item)
    ? item.suit === card.card.suit && item.rank === card.card.rank
    : item === card.index;

export const createInitialState = (
  stackOrder: Stack,
  timerDuration: number
): GameState => {
  const { card, choices } = generateNewCardAndChoices(stackOrder);
  return {
    successes: 0,
    fails: 0,
    card,
    choices,
    display: "card",
    timeRemaining: timerDuration,
    timerDuration,
  };
};

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
        card: action.payload.newCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
        timeRemaining: state.timerDuration,
      };
    // Note: WRONG_ANSWER intentionally does NOT reset the timer or advance to next card.
    // This allows users to retry the same card until they get it right or time runs out.
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
        card: action.payload.newCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
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
