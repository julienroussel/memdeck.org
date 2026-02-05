import { notifications } from "@mantine/notifications";
import { useEffect, useReducer } from "react";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";
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

export type GameAction =
  | { type: "CORRECT_ANSWER"; payload: { newScenario: AcaanScenario } }
  | { type: "WRONG_ANSWER"; payload: { newScenario: AcaanScenario } }
  | { type: "TIMEOUT"; payload: { newScenario: AcaanScenario } }
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
    default:
      return state;
  }
};

// --- Hook ---

export const useAcaanGame = (stackOrder: Stack) => {
  const { timerSettings } = useAcaanTimer();

  const [state, dispatch] = useReducer(
    gameReducer,
    { stackOrder, timerDuration: timerSettings.duration },
    ({ stackOrder, timerDuration }) =>
      createInitialState(stackOrder, timerDuration)
  );

  // Handle timer duration changes from settings
  useEffect(() => {
    dispatch({
      type: "RESET_TIMER",
      payload: { duration: timerSettings.duration },
    });
  }, [timerSettings.duration]);

  // Timer tick effect
  useEffect(() => {
    if (!timerSettings.enabled || state.timeRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerSettings.enabled, state.timeRemaining]);

  // Handle timeout
  useEffect(() => {
    if (!timerSettings.enabled || state.timeRemaining > 0) {
      return;
    }

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

    dispatch({
      type: "TIMEOUT",
      payload: { newScenario: generateAcaanScenario(stackOrder) },
    });
  }, [
    timerSettings.enabled,
    state.timeRemaining,
    state.scenario.cardPosition,
    state.scenario.targetPosition,
    stackOrder,
  ]);

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
        payload: { newScenario: generateAcaanScenario(stackOrder) },
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
        payload: { newScenario: generateAcaanScenario(stackOrder) },
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
