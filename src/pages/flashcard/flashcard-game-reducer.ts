import { timerReducerCases } from "../../hooks/use-game-timer";
import type {
  InitialStateConfig,
  ResetGameAction,
} from "../../hooks/use-reset-game-on-stack-change";
import type { NeighborDirection } from "../../types/flashcard";
import type { PlayingCard } from "../../types/playingcard";
import { shuffle } from "../../types/shuffle";
import {
  DEFAULT_STACK_LIMITS,
  type StackLimits,
} from "../../types/stack-limits";
import {
  getRandomPlayingCard,
  type PlayingCardPosition,
  type Stack,
} from "../../types/stacks";
import { isPlayingCard } from "../../types/typeguards";
import {
  generateNeighborChoices,
  generateUniqueCardChoices,
} from "../../utils/card-selection";
import {
  getNeighborCard,
  type ResolvedDirection,
  resolveDirection,
} from "../../utils/neighbor";
import type { DisplayMode } from "./utils";

// --- Types ---

export type GameState = {
  successes: number;
  fails: number;
  /** The card displayed as the question prompt */
  card: PlayingCardPosition;
  /** The card the user must select as the answer. Same as `card` for standard modes. */
  answerCard: PlayingCardPosition;
  choices: PlayingCardPosition[];
  display: DisplayMode;
  /** The resolved direction for neighbor mode, or null for standard modes */
  resolvedDirection: ResolvedDirection | null;
  timeRemaining: number;
  timerDuration: number;
};

export type AdvancePayload = {
  newCard: PlayingCardPosition;
  newAnswerCard: PlayingCardPosition;
  newChoices: PlayingCardPosition[];
  newDisplay: DisplayMode;
  newResolvedDirection: ResolvedDirection | null;
};

type TimeoutAction = {
  type: "TIMEOUT";
  payload: AdvancePayload;
};

type GameAction =
  | {
      type: "CORRECT_ANSWER";
      payload: AdvancePayload;
    }
  | { type: "WRONG_ANSWER" }
  | TimeoutAction
  | {
      type: "REVEAL_ANSWER";
      payload: AdvancePayload;
    }
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } }
  | ResetGameAction;

// --- Pure Functions ---

export const generateNewCardAndChoices = (
  stackOrder: Stack,
  limits: StackLimits
): { card: PlayingCardPosition; choices: PlayingCardPosition[] } => {
  const newCard = getRandomPlayingCard(stackOrder, limits);
  const newChoices = shuffle(
    generateUniqueCardChoices(stackOrder, limits, [newCard])
  );
  return { card: newCard, choices: newChoices };
};

export const generateNeighborCardAndChoices = (
  stackOrder: Stack,
  direction: NeighborDirection,
  limits: StackLimits
): {
  card: PlayingCardPosition;
  answerCard: PlayingCardPosition;
  choices: PlayingCardPosition[];
  resolvedDirection: ResolvedDirection;
} => {
  const questionCard = getRandomPlayingCard(stackOrder, limits);
  const resolved = resolveDirection(direction);
  const answerCard = getNeighborCard(
    stackOrder,
    questionCard,
    resolved,
    limits
  );
  const choices = shuffle(
    generateNeighborChoices(stackOrder, answerCard, questionCard, limits)
  );
  return {
    card: questionCard,
    answerCard,
    choices,
    resolvedDirection: resolved,
  };
};

export const isCorrectAnswer = (
  item: PlayingCard | number,
  card: PlayingCardPosition
): boolean =>
  isPlayingCard(item)
    ? item.suit === card.card.suit && item.rank === card.card.rank
    : item === card.index;

export const createInitialState = (config: InitialStateConfig): GameState => {
  const { stackOrder, timerDuration, limits = DEFAULT_STACK_LIMITS } = config;
  if (config.flashcardMode === "neighbor") {
    const { card, answerCard, choices, resolvedDirection } =
      generateNeighborCardAndChoices(
        stackOrder,
        config.neighborDirection,
        limits
      );
    return {
      successes: 0,
      fails: 0,
      card,
      answerCard,
      choices,
      display: "card",
      resolvedDirection,
      timeRemaining: timerDuration,
      timerDuration,
    };
  }
  const { card, choices } = generateNewCardAndChoices(stackOrder, limits);
  return {
    successes: 0,
    fails: 0,
    card,
    answerCard: card,
    choices,
    display: "card",
    resolvedDirection: null,
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
        answerCard: action.payload.newAnswerCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
        resolvedDirection: action.payload.newResolvedDirection,
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
        answerCard: action.payload.newAnswerCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
        resolvedDirection: action.payload.newResolvedDirection,
        timeRemaining: state.timerDuration,
      };
    case "TICK":
      return timerReducerCases.TICK(state);
    case "RESET_TIMER":
      return timerReducerCases.RESET_TIMER(state, action.payload.duration);
    case "RESET_GAME":
      return createInitialState(action.payload);
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
};
