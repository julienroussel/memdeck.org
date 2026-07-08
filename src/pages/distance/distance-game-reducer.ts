import { MIN_DISTANCE_RANGE } from "../../constants";
import { timerReducerCases } from "../../hooks/use-game-timer";
import type {
  DistanceConvention,
  DistanceMode,
  DistancePromptKind,
} from "../../types/distance";
import type { PlayingCard } from "../../types/playingcard";
import { shuffle } from "../../types/shuffle";
import type { StackLimits } from "../../types/stack-limits";
import {
  createDeckPosition,
  getCardAt,
  getRandomPlayingCard,
  getUniqueRandomCard,
  type PlayingCardPosition,
  type Stack,
} from "../../types/stacks";
import { generateNeighborChoices } from "../../utils/card-selection";
import {
  applyOffset,
  computeDistance,
  pickComputeDistractors,
  pickRandomOffset,
} from "../../utils/distance";

// --- Types ---

/**
 * Round-shaped fields, discriminated by `display`. Compute rounds always have
 * a non-null `expectedDistance` and numeric choices; Apply rounds always have
 * a non-null `offset` and card choices. This makes the impossible states
 * (e.g., display="apply" with offset=null) unrepresentable.
 */
export type PlayableDistanceRound =
  | {
      display: "compute";
      expectedDistance: number;
      offset: null;
      answerCard: PlayingCardPosition;
      choices: { kind: "numbers"; data: number[] };
    }
  | {
      display: "apply";
      expectedDistance: null;
      offset: number;
      answerCard: PlayingCardPosition;
      choices: { kind: "cards"; data: PlayingCardPosition[] };
    };

/**
 * A playable round, or the `range-too-small` state produced when
 * `cycleSize < MIN_DISTANCE_RANGE`. The latter carries no prompt data —
 * consumers must narrow on `display` before reading round fields, which makes
 * reading prompt data from an unplayable round a compile-time error.
 */
export type DistanceRound =
  | PlayableDistanceRound
  | { display: "range-too-small" };

/**
 * The user's submitted answer, discriminated to match the current round kind.
 * Compute rounds receive a numeric value; Apply rounds receive a `PlayingCard`.
 */
export type DistanceAnswer =
  | { kind: "compute"; value: number }
  | { kind: "apply"; value: PlayingCard };

type GameStateBase = {
  successes: number;
  fails: number;
  /** The card displayed as the question prompt. */
  card: PlayingCardPosition;
  /** Convention frozen for the current round (settings change applies next round). */
  convention: DistanceConvention;
  timeRemaining: number;
  timerDuration: number;
};

export type GameState = GameStateBase & DistanceRound;

type AdvancePayloadBase = {
  newCard: PlayingCardPosition;
  newConvention: DistanceConvention;
};

type AdvanceRound =
  | {
      newDisplay: "compute";
      newExpectedDistance: number;
      newOffset: null;
      newAnswerCard: PlayingCardPosition;
      newChoices: { kind: "numbers"; data: number[] };
    }
  | {
      newDisplay: "apply";
      newExpectedDistance: null;
      newOffset: number;
      newAnswerCard: PlayingCardPosition;
      newChoices: { kind: "cards"; data: PlayingCardPosition[] };
    }
  | { newDisplay: "range-too-small" };

export type AdvancePayload = AdvancePayloadBase & AdvanceRound;

type DistanceInitialStateConfig = {
  stackOrder: Stack;
  timerDuration: number;
  distanceMode: DistanceMode;
  convention: DistanceConvention;
  limits: StackLimits;
};

type ResetDistanceGameAction = {
  type: "RESET_GAME";
  payload: DistanceInitialStateConfig;
};

type GameAction =
  | { type: "CORRECT_ANSWER"; payload: AdvancePayload }
  | { type: "WRONG_ANSWER" }
  | { type: "TIMEOUT"; payload: AdvancePayload }
  | { type: "REVEAL_ANSWER"; payload: AdvancePayload }
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } }
  | ResetDistanceGameAction;

// --- Pure generators ---

/**
 * Generate a Compute round: two cards in range, the user picks the distance
 * between them.
 */
export const generateComputePrompt = (
  stackOrder: Stack,
  convention: DistanceConvention,
  limits: StackLimits
): {
  card: PlayingCardPosition;
  answerCard: PlayingCardPosition;
  choices: { kind: "numbers"; data: number[] };
  distance: number;
} => {
  const promptCard = getRandomPlayingCard(stackOrder, limits);
  const targetCard = getUniqueRandomCard(stackOrder, [promptCard], limits);
  const distance = computeDistance(
    promptCard.index - 1,
    targetCard.index - 1,
    convention,
    limits
  );
  const cycleSize = limits.end - limits.start + 1;
  const distractors = pickComputeDistractors(
    distance,
    convention,
    cycleSize,
    4
  );
  const choices = shuffle([distance, ...distractors]);
  return {
    answerCard: targetCard,
    card: promptCard,
    choices: { data: choices, kind: "numbers" },
    distance,
  };
};

/**
 * Generate an Apply round: one card and an offset; the user picks the card
 * that lies at that offset.
 */
export const generateApplyPrompt = (
  stackOrder: Stack,
  convention: DistanceConvention,
  limits: StackLimits
): {
  card: PlayingCardPosition;
  answerCard: PlayingCardPosition;
  choices: { kind: "cards"; data: PlayingCardPosition[] };
  offset: number;
} => {
  const promptCard = getRandomPlayingCard(stackOrder, limits);
  const cycleSize = limits.end - limits.start + 1;
  const offset = pickRandomOffset(convention, cycleSize);
  const { zeroBased } = applyOffset(promptCard.index - 1, offset, limits);
  const targetCard: PlayingCardPosition = {
    card: getCardAt(stackOrder, zeroBased),
    index: createDeckPosition(zeroBased + 1),
  };
  const cardChoices = shuffle(
    generateNeighborChoices(stackOrder, targetCard, promptCard, limits)
  );
  return {
    answerCard: targetCard,
    card: promptCard,
    choices: { data: cardChoices, kind: "cards" },
    offset,
  };
};

const pickPromptKind = (mode: DistanceMode): DistancePromptKind => {
  if (mode === "both") {
    return Math.random() < 0.5 ? "compute" : "apply";
  }
  if (mode === "compute" || mode === "apply") {
    return mode;
  }
  const _exhaustive: never = mode;
  return _exhaustive;
};

/**
 * Builds the `range-too-small` payload. The prompt card is a stable
 * placeholder (the first card in range) so `GameState.card` stays populated;
 * the round itself carries no prompt data — consumers must narrow on
 * `display` before reading it.
 */
const buildRangeTooSmallPayload = (
  stackOrder: Stack,
  convention: DistanceConvention,
  limits: StackLimits
): AdvancePayload => ({
  newCard: {
    card: getCardAt(stackOrder, limits.start - 1),
    index: limits.start,
  },
  newConvention: convention,
  newDisplay: "range-too-small",
});

/**
 * Build the next-round payload, used by both initial state and every
 * post-answer transition. When `rangeSize < MIN_DISTANCE_RANGE` (the
 * minimum needed to pick 5 unique choices), returns a `range-too-small`
 * payload — the page renders the rangeTooSmall banner in that case.
 */
export const generateNextDistanceRound = (
  stackOrder: Stack,
  mode: DistanceMode,
  convention: DistanceConvention,
  limits: StackLimits
): AdvancePayload => {
  const cycleSize = limits.end - limits.start + 1;
  if (cycleSize < MIN_DISTANCE_RANGE) {
    return buildRangeTooSmallPayload(stackOrder, convention, limits);
  }
  const kind = pickPromptKind(mode);
  if (kind === "compute") {
    const round = generateComputePrompt(stackOrder, convention, limits);
    return {
      newAnswerCard: round.answerCard,
      newCard: round.card,
      newChoices: round.choices,
      newConvention: convention,
      newDisplay: "compute",
      newExpectedDistance: round.distance,
      newOffset: null,
    };
  }
  const round = generateApplyPrompt(stackOrder, convention, limits);
  return {
    newAnswerCard: round.answerCard,
    newCard: round.card,
    newChoices: round.choices,
    newConvention: convention,
    newDisplay: "apply",
    newExpectedDistance: null,
    newOffset: round.offset,
  };
};

/**
 * Compares a user's discriminated answer against the active round.
 * Compute: numeric value must match `expectedDistance`.
 * Apply: card must match `answerCard.card` by suit and rank.
 * A `range-too-small` round has no answer, so every submission is wrong.
 */
export const isCorrectAnswer = (
  answer: DistanceAnswer,
  round: DistanceRound
): boolean => {
  if (round.display === "range-too-small") {
    return false;
  }
  if (answer.kind === "compute") {
    return (
      round.display === "compute" && answer.value === round.expectedDistance
    );
  }
  if (round.display !== "apply") {
    return false;
  }
  return (
    answer.value.suit === round.answerCard.card.suit &&
    answer.value.rank === round.answerCard.card.rank
  );
};

const buildStateFromPayload = (
  base: GameStateBase,
  payload: AdvancePayload
): GameState => {
  if (payload.newDisplay === "range-too-small") {
    return {
      ...base,
      card: payload.newCard,
      convention: payload.newConvention,
      display: "range-too-small",
    };
  }
  if (payload.newDisplay === "compute") {
    return {
      ...base,
      answerCard: payload.newAnswerCard,
      card: payload.newCard,
      choices: payload.newChoices,
      convention: payload.newConvention,
      display: "compute",
      expectedDistance: payload.newExpectedDistance,
      offset: null,
    };
  }
  return {
    ...base,
    answerCard: payload.newAnswerCard,
    card: payload.newCard,
    choices: payload.newChoices,
    convention: payload.newConvention,
    display: "apply",
    expectedDistance: null,
    offset: payload.newOffset,
  };
};

export const createInitialState = (
  config: DistanceInitialStateConfig
): GameState => {
  const { stackOrder, timerDuration, distanceMode, convention, limits } =
    config;
  const round = generateNextDistanceRound(
    stackOrder,
    distanceMode,
    convention,
    limits
  );
  return buildStateFromPayload(
    {
      card: round.newCard,
      convention: round.newConvention,
      fails: 0,
      successes: 0,
      timeRemaining: timerDuration,
      timerDuration,
    },
    round
  );
};

// --- Reducer ---

/**
 * Increments `fails` while preserving the caller's `GameState` shape. Generic
 * over `S extends GameState` so the call site keeps the discriminated-union
 * member it had — spreading a bare `GameState` would otherwise widen to the
 * cross-product of `DistanceRound` members and lose the
 * discriminator-correlated fields.
 */
const bumpFails = <S extends GameState>(state: S): S => ({
  ...state,
  fails: state.fails + 1,
});

export const gameReducer = (
  state: GameState,
  action: GameAction
): GameState => {
  switch (action.type) {
    case "CORRECT_ANSWER":
      return buildStateFromPayload(
        {
          card: action.payload.newCard,
          convention: action.payload.newConvention,
          fails: state.fails,
          successes: state.successes + 1,
          timeRemaining: state.timerDuration,
          timerDuration: state.timerDuration,
        },
        action.payload
      );
    // WRONG_ANSWER intentionally does not advance — the user retries the same
    // round until they get it or time runs out. Mirrors flashcard behavior.
    //
    // `bumpFails` is generic over `S extends GameState`, so the call site
    // preserves the union-of-members shape rather than widening to the
    // cross-product (which would pair `display: "compute"` with
    // `offset: number`, etc.). This collapses the previously duplicated
    // per-discriminant arms into a single statement.
    case "WRONG_ANSWER":
      return bumpFails(state);
    case "TIMEOUT":
    case "REVEAL_ANSWER":
      return buildStateFromPayload(
        {
          card: action.payload.newCard,
          convention: action.payload.newConvention,
          fails: state.fails + 1,
          successes: state.successes,
          timeRemaining: state.timerDuration,
          timerDuration: state.timerDuration,
        },
        action.payload
      );
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
