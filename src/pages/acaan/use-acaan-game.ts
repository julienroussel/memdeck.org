import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";
import { timerReducerCases, useGameTimer } from "../../hooks/use-game-timer";
import type { GameScore } from "../../types/game";
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
  | { type: "WRONG_ANSWER"; payload: { newScenario: AcaanScenario } }
  | TimeoutAction
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } };

// --- Pure Functions ---

export const formatCutDepthMessage = (
  cardPosition: number,
  targetPosition: number,
  correctAnswer: number
): string => {
  const cutDepthText =
    correctAnswer === 0 ? "0 (no cut needed)" : String(correctAnswer);
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
    case "WRONG_ANSWER":
      return {
        ...state,
        fails: state.fails + 1,
        scenario: action.payload.newScenario,
        timeRemaining: state.timerDuration,
      };
    case "TIMEOUT":
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
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
};

// --- Hook ---

type UseAcaanGameResult = {
  scenario: AcaanScenario;
  score: GameScore;
  timeRemaining: number;
  timerEnabled: boolean;
  timerDuration: number;
  submitAnswer: (userAnswer: number) => void;
};

export const useAcaanGame = (stackOrder: Stack): UseAcaanGameResult => {
  const { timerSettings } = useAcaanTimer();

  // Use ref to avoid stackOrder in effect dependencies (prevents unnecessary re-runs)
  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;

  const [state, dispatch] = useReducer(
    gameReducer,
    { stackOrder, timerDuration: timerSettings.duration },
    ({ stackOrder, timerDuration }) =>
      createInitialState(stackOrder, timerDuration)
  );

  // Memoize dispatch to satisfy useGameTimer's stable reference requirement
  const stableDispatch = useCallback(
    (action: GameAction) => dispatch(action),
    []
  );

  const createTimeoutAction = useCallback(
    (): TimeoutAction => ({
      type: "TIMEOUT",
      payload: { newScenario: generateAcaanScenario(stackOrderRef.current) },
    }),
    []
  );

  const handleTimeout = useCallback(() => {
    const correctAnswer = calculateCutDepth(
      state.scenario.cardPosition,
      state.scenario.targetPosition
    );

    notifications.show({
      color: "red",
      title: "Time's up!",
      message: formatCutDepthMessage(
        state.scenario.cardPosition,
        state.scenario.targetPosition,
        correctAnswer
      ),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
  }, [state.scenario.cardPosition, state.scenario.targetPosition]);

  useGameTimer({
    timerSettings,
    timeRemaining: state.timeRemaining,
    dispatch: stableDispatch,
    createTimeoutAction,
    onTimeout: handleTimeout,
  });

  const submitAnswer = (userAnswer: number) => {
    const correctAnswer = calculateCutDepth(
      state.scenario.cardPosition,
      state.scenario.targetPosition
    );
    const isCorrect = userAnswer === correctAnswer;

    if (isCorrect) {
      notifications.show({
        color: "green",
        title: "Correct!",
        message: formatCutDepthMessage(
          state.scenario.cardPosition,
          state.scenario.targetPosition,
          correctAnswer
        ),
        autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      });
      dispatch({
        type: "CORRECT_ANSWER",
        payload: { newScenario: generateAcaanScenario(stackOrderRef.current) },
      });
    } else {
      notifications.show({
        color: "red",
        title: "Wrong answer",
        message: `You answered ${userAnswer}. ${formatCutDepthMessage(
          state.scenario.cardPosition,
          state.scenario.targetPosition,
          correctAnswer
        )}`,
        autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      });
      dispatch({
        type: "WRONG_ANSWER",
        payload: { newScenario: generateAcaanScenario(stackOrderRef.current) },
      });
    }
  };

  return {
    scenario: state.scenario,
    score: { successes: state.successes, fails: state.fails },
    timeRemaining: state.timeRemaining,
    timerEnabled: timerSettings.enabled,
    timerDuration: state.timerDuration,
    submitAnswer,
  };
};
