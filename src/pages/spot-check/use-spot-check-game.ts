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
import type { Stack, StackValue } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import {
  type MissingCardPuzzle,
  type MovedCardPuzzle,
  moveCard,
  removeSingleCard,
  type SwappedCardsPuzzle,
  swapTwoCards,
} from "./utils";

// --- State ---

type PuzzleState =
  | { mode: "missing"; puzzle: MissingCardPuzzle }
  | { mode: "swapped"; puzzle: SwappedCardsPuzzle }
  | { mode: "moved"; puzzle: MovedCardPuzzle };

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
        stackOrder: Stack;
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
        action.payload.stackOrder,
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

const generatePuzzle = (
  stackOrder: Stack,
  mode: SpotCheckMode
): PuzzleState => {
  switch (mode) {
    case "missing":
      return { mode: "missing", puzzle: removeSingleCard(stackOrder) };
    case "swapped":
      return { mode: "swapped", puzzle: swapTwoCards(stackOrder) };
    case "moved":
      return { mode: "moved", puzzle: moveCard(stackOrder) };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown spot check mode: ${_exhaustive}`);
    }
  }
};

const createInitialState = (
  stackOrder: Stack,
  timerDuration: number,
  mode: SpotCheckMode
): GameState => ({
  successes: 0,
  fails: 0,
  puzzleState: generatePuzzle(stackOrder, mode),
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
  options?: UseSpotCheckGameOptions
): UseSpotCheckGameResult => {
  const { t } = useTranslation();

  const onAnswerRef = useRef(options?.onAnswer);
  onAnswerRef.current = options?.onAnswer;

  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;

  const spotCheckModeRef = useRef(spotCheckMode);
  spotCheckModeRef.current = spotCheckMode;

  const [state, dispatch] = useReducer(
    gameReducer,
    { stackOrder, timerDuration: timerSettings.duration, mode: spotCheckMode },
    ({ stackOrder: s, timerDuration: d, mode: m }) =>
      createInitialState(s, d, m)
  );

  // Reset game when stack changes
  const prevStackOrderRef = useRef(stackOrder);
  if (prevStackOrderRef.current !== stackOrder) {
    prevStackOrderRef.current = stackOrder;
    dispatch({
      type: "RESET_GAME",
      payload: {
        stackOrder,
        timerDuration: timerSettings.duration,
        spotCheckMode: spotCheckModeRef.current,
      },
    });
  }

  // Reset game when mode changes
  const prevModeRef = useRef(spotCheckMode);
  if (prevModeRef.current !== spotCheckMode) {
    prevModeRef.current = spotCheckMode;
    dispatch({
      type: "RESET_GAME",
      payload: {
        stackOrder,
        timerDuration: timerSettings.duration,
        spotCheckMode,
      },
    });
  }

  const puzzleStateRef = useRef(state.puzzleState);
  puzzleStateRef.current = state.puzzleState;

  const generateNextRound = useCallback(
    (): AdvancePayload => ({
      newPuzzle: generatePuzzle(
        stackOrderRef.current,
        spotCheckModeRef.current
      ),
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

  const isCorrectAnswer = useCallback(
    (card: PlayingCard, index: number): boolean => {
      const ps = puzzleStateRef.current;
      switch (ps.mode) {
        case "missing": {
          // In the 51-card array, the gap is at missingIndex.
          // Tapping the card just before or just after the gap is correct.
          // The deck wraps: if the gap is at position 0, the last card
          // (index 50) is "before" it; if at position 51, index 0 is "after".
          const gap = ps.puzzle.missingIndex;
          const len = ps.puzzle.cards.length;
          const before = (gap - 1 + len) % len;
          const after = gap % len;
          return index === before || index === after;
        }
        case "swapped":
          // Either swapped card is correct
          return (
            card === stackOrderRef.current[ps.puzzle.indexA] ||
            card === stackOrderRef.current[ps.puzzle.indexB]
          );
        case "moved":
          return card === ps.puzzle.movedCard;
        default: {
          const _exhaustive: never = ps;
          throw new Error(`Unknown puzzle mode: ${_exhaustive}`);
        }
      }
    },
    []
  );

  const submitAnswer = useCallback(
    (card: PlayingCard, index: number) => {
      const correct = isCorrectAnswer(card, index);

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
    [stackName, isCorrectAnswer, generateNextRound, t]
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
