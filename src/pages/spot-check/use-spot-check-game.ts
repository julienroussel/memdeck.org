import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useGameTimer } from "../../hooks/use-game-timer";
import { eventBus } from "../../services/event-bus";
import type { GameScore } from "../../types/game";
import type { PlayingCard } from "../../types/playingcard";
import type { AnswerOutcome } from "../../types/session";
import type { SpotCheckMode } from "../../types/spot-check";
import { isFullDeck, type StackLimits } from "../../types/stack-limits";
import type { Stack, StackValue } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import {
  isSpotCheckAnswerCorrect,
  moveCard,
  type PuzzleState,
  removeSingleCard,
  swapTwoCards,
} from "./utils";

// --- State ---

type GameState = {
  successes: number;
  fails: number;
  puzzleState: PuzzleState;
  timeRemaining: number;
  timerDuration: number;
};

// --- Actions ---

type AdvancePayload = {
  newPuzzle: PuzzleState;
};

type GameAction =
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

// --- Reducer ---

const gameReducer = (state: GameState, action: GameAction): GameState => {
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
      return {
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 1),
      };
    case "RESET_TIMER":
      return {
        ...state,
        timeRemaining: action.payload.duration,
        timerDuration: action.payload.duration,
      };
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

// --- Helpers ---

const getCardsForPuzzle = (
  stackOrder: Stack,
  limits: StackLimits
): readonly PlayingCard[] => {
  if (isFullDeck(limits)) {
    return stackOrder;
  }
  return stackOrder.slice(limits.start - 1, limits.end);
};

const generatePuzzle = (
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

const createInitialState = (
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

// --- Hook ---

type UseSpotCheckGameOptions = {
  onAnswer?: (outcome: AnswerOutcome) => void;
};

type UseSpotCheckGameResult = {
  score: GameScore;
  puzzleCards: PlayingCard[];
  puzzleState: PuzzleState;
  timeRemaining: number;
  timerDuration: number;
  submitAnswer: (card: PlayingCard, index: number) => void;
  revealAnswer: () => void;
};

export const useSpotCheckGame = (
  stackOrder: Stack,
  stackName: StackValue["name"],
  spotCheckMode: SpotCheckMode,
  timerSettings: TimerSettings,
  limits: StackLimits,
  options?: UseSpotCheckGameOptions
): UseSpotCheckGameResult => {
  const { t } = useTranslation();

  const onAnswerRef = useRef(options?.onAnswer);
  onAnswerRef.current = options?.onAnswer;

  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;

  const spotCheckModeRef = useRef(spotCheckMode);
  spotCheckModeRef.current = spotCheckMode;

  const limitsRef = useRef(limits);
  limitsRef.current = limits;

  const cardsRef = useRef(getCardsForPuzzle(stackOrder, limits));

  const [state, dispatch] = useReducer(
    gameReducer,
    {
      stackOrder,
      timerDuration: timerSettings.duration,
      mode: spotCheckMode,
      limits,
    },
    ({ stackOrder: s, timerDuration: d, mode: m, limits: l }) =>
      createInitialState(getCardsForPuzzle(s, l), d, m)
  );

  // Reset game when stack, mode, or limits change
  const prevStackOrderRef = useRef(stackOrder);
  const prevModeRef = useRef(spotCheckMode);
  const prevLimitsRef = useRef(limits);

  const stackChanged = prevStackOrderRef.current !== stackOrder;
  const modeChanged = prevModeRef.current !== spotCheckMode;
  const limitsChanged =
    prevLimitsRef.current.start !== limits.start ||
    prevLimitsRef.current.end !== limits.end;

  // Note: timerSettings.duration is intentionally excluded from change detection.
  // Duration changes are handled by useGameTimer via the RESET_TIMER action.
  if (stackChanged || modeChanged || limitsChanged) {
    prevStackOrderRef.current = stackOrder;
    prevModeRef.current = spotCheckMode;
    prevLimitsRef.current = limits;
    cardsRef.current = getCardsForPuzzle(stackOrder, limits);
    dispatch({
      type: "RESET_GAME",
      payload: {
        cards: cardsRef.current,
        timerDuration: timerSettings.duration,
        spotCheckMode,
      },
    });
  }

  const puzzleStateRef = useRef(state.puzzleState);
  puzzleStateRef.current = state.puzzleState;

  const generateNextRound = useCallback(
    (): AdvancePayload => ({
      newPuzzle: generatePuzzle(cardsRef.current, spotCheckModeRef.current),
    }),
    []
  );

  const createTimeoutAction = useCallback(() => {
    const payload = generateNextRound();
    return { type: "TIMEOUT" as const, payload };
  }, [generateNextRound]);

  const handleTimeout = useCallback(() => {
    notifications.show({
      color: "red",
      title: t("spotCheck.timesUp"),
      message: t("spotCheck.movingToNext"),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
    eventBus.emit.SPOT_CHECK_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName, t]);

  useGameTimer({
    timerSettings,
    timeRemaining: state.timeRemaining,
    dispatch,
    createTimeoutAction,
    onTimeout: handleTimeout,
  });

  const submitAnswer = useCallback(
    (card: PlayingCard, index: number) => {
      const correct = isSpotCheckAnswerCorrect(
        card,
        index,
        puzzleStateRef.current,
        cardsRef.current
      );

      if (correct) {
        notifications.show({
          color: "green",
          title: t("spotCheck.correctAnswer"),
          message: "",
          autoClose: NOTIFICATION_CLOSE_TIMEOUT,
        });
        const payload = generateNextRound();
        dispatch({ type: "CORRECT_ANSWER", payload });
        onAnswerRef.current?.({ correct: true, questionAdvanced: true });
      } else {
        notifications.show({
          color: "red",
          title: t("spotCheck.wrongAnswer"),
          message: "",
          autoClose: NOTIFICATION_CLOSE_TIMEOUT,
        });
        dispatch({ type: "WRONG_ANSWER" });
        onAnswerRef.current?.({ correct: false, questionAdvanced: false });
      }

      eventBus.emit.SPOT_CHECK_ANSWER({ correct, stackName });
    },
    [stackName, generateNextRound, t]
  );

  const revealAnswer = useCallback(() => {
    const ps = puzzleStateRef.current;
    let revealMessage: string;
    switch (ps.mode) {
      case "missing":
        revealMessage = t("spotCheck.revealMissing", {
          position: ps.puzzle.missingIndex + 1,
        });
        break;
      case "swapped":
        revealMessage = t("spotCheck.revealSwapped", {
          posA: ps.puzzle.indexA + 1,
          posB: ps.puzzle.indexB + 1,
        });
        break;
      case "moved":
        revealMessage = t("spotCheck.revealMoved", {
          position: ps.puzzle.newIndex + 1,
        });
        break;
      default: {
        const _exhaustive: never = ps;
        throw new Error(`Unknown puzzle mode: ${_exhaustive}`);
      }
    }

    notifications.show({
      color: "yellow",
      title: t("spotCheck.revealTitle"),
      message: revealMessage,
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });

    const payload = generateNextRound();
    dispatch({ type: "REVEAL_ANSWER", payload });
    eventBus.emit.SPOT_CHECK_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName, generateNextRound, t]);

  return {
    score: { successes: state.successes, fails: state.fails },
    puzzleCards: state.puzzleState.puzzle.cards,
    puzzleState: state.puzzleState,
    timeRemaining: state.timeRemaining,
    timerDuration: state.timerDuration,
    submitAnswer,
    revealAnswer,
  };
};
