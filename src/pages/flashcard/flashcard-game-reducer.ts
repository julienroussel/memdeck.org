import { DEFAULT_CHOICES_COUNT } from "../../constants";
import { timerReducerCases } from "../../hooks/use-game-timer";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import type { PlayingCard } from "../../types/playingcard";
import type { BaseResetGameAction } from "../../types/reset-game-action";
import { shuffle } from "../../types/shuffle";
import type { StackLimits } from "../../types/stack-limits";
import { DEFAULT_STACK_LIMITS } from "../../types/stack-limits";
import type {
  DeckPosition,
  PlayingCardPosition,
  Stack,
} from "../../types/stacks";
import { getCardAt, getRandomPlayingCard } from "../../types/stacks";
import { isPlayingCard } from "../../types/typeguards";
import {
  generateNeighborChoices,
  generateUniqueCardChoices,
} from "../../utils/card-selection";
import type { ResolvedDirection } from "../../utils/neighbor";
import { getNeighborCard, resolveDirection } from "../../utils/neighbor";
import type { FlashcardPool } from "./flashcard-pool";
import { DEFAULT_FLASHCARD_POOL } from "./flashcard-pool";
import type { DisplayMode } from "./utils";

// --- Types ---

type InitialStateConfig = BaseResetGameAction & {
  pool?: FlashcardPool;
} & (
    | { flashcardMode: "neighbor"; neighborDirection: NeighborDirection }
    | { flashcardMode?: Exclude<FlashcardMode, "neighbor"> }
  );

type ResetGameAction = {
  type: "RESET_GAME";
  payload: InitialStateConfig;
};

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

type NeighborRound = {
  card: PlayingCardPosition;
  answerCard: PlayingCardPosition;
  choices: PlayingCardPosition[];
  resolvedDirection: ResolvedDirection;
};

const buildNeighborRound = (
  stackOrder: Stack,
  direction: NeighborDirection,
  questionCard: PlayingCardPosition,
  limits: StackLimits
): NeighborRound => {
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
    answerCard,
    card: questionCard,
    choices,
    resolvedDirection: resolved,
  };
};

export const generateNeighborCardAndChoices = (
  stackOrder: Stack,
  direction: NeighborDirection,
  limits: StackLimits
): NeighborRound =>
  buildNeighborRound(
    stackOrder,
    direction,
    getRandomPlayingCard(stackOrder, limits),
    limits
  );

const toCardPosition = (
  stackOrder: Stack,
  index: DeckPosition
): PlayingCardPosition => ({ card: getCardAt(stackOrder, index - 1), index });

const pickRandomPosition = (
  positions: readonly DeckPosition[]
): DeckPosition => {
  const position = positions[Math.floor(Math.random() * positions.length)];
  if (position === undefined) {
    throw new Error("Cannot draw from an empty focus list");
  }
  return position;
};

/**
 * Draws the prompt and every distractor from the focus list. Distractors from
 * the full deck would leave the answer as the only listed position among the
 * choices: in card-only rounds, whose choices are the positions the user
 * typed, that gives the answer away.
 */
export const generateFocusCardAndChoices = (
  stackOrder: Stack,
  positions: readonly DeckPosition[]
): { card: PlayingCardPosition; choices: PlayingCardPosition[] } => {
  const drawn = shuffle([...positions])
    .slice(0, DEFAULT_CHOICES_COUNT)
    .map((position) => toCardPosition(stackOrder, position));
  const [card] = drawn;
  if (card === undefined) {
    throw new Error("Cannot draw from an empty focus list");
  }
  return { card, choices: shuffle(drawn) };
};

/**
 * Draws the question card from the focus list; the answer is its real
 * neighbour in the stack, wrapping at the ends of the full deck, and the
 * distractors come from the full deck. Distractors from the list would leave
 * the answer, usually outside the list, as the odd one out, and wrapping
 * inside the list would make neighbours of positions that are not.
 */
export const generateFocusNeighborCardAndChoices = (
  stackOrder: Stack,
  direction: NeighborDirection,
  positions: readonly DeckPosition[]
): NeighborRound =>
  buildNeighborRound(
    stackOrder,
    direction,
    toCardPosition(stackOrder, pickRandomPosition(positions)),
    DEFAULT_STACK_LIMITS
  );

export const generatePoolCardAndChoices = (
  stackOrder: Stack,
  pool: FlashcardPool
): { card: PlayingCardPosition; choices: PlayingCardPosition[] } =>
  pool.kind === "focus"
    ? generateFocusCardAndChoices(stackOrder, pool.positions)
    : generateNewCardAndChoices(stackOrder, pool.limits);

export const generatePoolNeighborCardAndChoices = (
  stackOrder: Stack,
  direction: NeighborDirection,
  pool: FlashcardPool
): NeighborRound =>
  pool.kind === "focus"
    ? generateFocusNeighborCardAndChoices(stackOrder, direction, pool.positions)
    : generateNeighborCardAndChoices(stackOrder, direction, pool.limits);

export const isCorrectAnswer = (
  item: PlayingCard | number,
  card: PlayingCardPosition
): boolean =>
  isPlayingCard(item)
    ? item.suit === card.card.suit && item.rank === card.card.rank
    : item === card.index;

export const createInitialState = (config: InitialStateConfig): GameState => {
  const { stackOrder, timerDuration, pool = DEFAULT_FLASHCARD_POOL } = config;
  if (config.flashcardMode === "neighbor") {
    const { card, answerCard, choices, resolvedDirection } =
      generatePoolNeighborCardAndChoices(
        stackOrder,
        config.neighborDirection,
        pool
      );
    return {
      answerCard,
      card,
      choices,
      display: "card",
      fails: 0,
      resolvedDirection,
      successes: 0,
      timeRemaining: timerDuration,
      timerDuration,
    };
  }
  const { card, choices } = generatePoolCardAndChoices(stackOrder, pool);
  return {
    answerCard: card,
    card,
    choices,
    display: "card",
    fails: 0,
    resolvedDirection: null,
    successes: 0,
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
        answerCard: action.payload.newAnswerCard,
        card: action.payload.newCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
        resolvedDirection: action.payload.newResolvedDirection,
        successes: state.successes + 1,
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
        answerCard: action.payload.newAnswerCard,
        card: action.payload.newCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
        fails: state.fails + 1,
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
