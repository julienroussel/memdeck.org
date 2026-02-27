import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";
import { timerReducerCases, useGameTimer } from "../../hooks/use-game-timer";
import {
  type ResetGameAction,
  useResetGameOnStackChange,
} from "../../hooks/use-reset-game-on-stack-change";
import { eventBus } from "../../services/event-bus";
import type { GameScore } from "../../types/game";
import type { AnswerOutcome } from "../../types/session";
import type { Stack, StackValue } from "../../types/stacks";
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
    // Note: WRONG_ANSWER intentionally does NOT reset the timer or advance to next scenario.
    // This allows users to retry the same question until they get it right or time runs out.
    // Changed from previous behavior where wrong answers advanced to the next scenario.
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

// --- Hook ---

type UseAcaanGameOptions = {
  onAnswer?: (outcome: AnswerOutcome) => void;
};

type UseAcaanGameResult = {
  scenario: AcaanScenario;
  score: GameScore;
  timeRemaining: number;
  timerEnabled: boolean;
  timerDuration: number;
  submitAnswer: (userAnswer: number) => void;
  revealAnswer: () => void;
};

export const useAcaanGame = (
  stackOrder: Stack,
  stackName: StackValue["name"],
  options?: UseAcaanGameOptions
): UseAcaanGameResult => {
  const { timerSettings } = useAcaanTimer();

  // Use ref to access latest stackOrder/stackName in callbacks without re-creating them
  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;
  const stackNameRef = useRef(stackName);
  stackNameRef.current = stackName;

  const onAnswerRef = useRef(options?.onAnswer);
  onAnswerRef.current = options?.onAnswer;

  const [state, dispatch] = useReducer(
    gameReducer,
    { stackOrder, timerDuration: timerSettings.duration },
    ({ stackOrder, timerDuration }) =>
      createInitialState(stackOrder, timerDuration)
  );

  useResetGameOnStackChange(stackOrder, timerSettings.duration, dispatch);

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
    eventBus.emit.ACAAN_ANSWER({
      correct: false,
      stackName: stackNameRef.current,
    });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [state.scenario.cardPosition, state.scenario.targetPosition]);

  useGameTimer({
    timerSettings,
    timeRemaining: state.timeRemaining,
    dispatch,
    createTimeoutAction,
    onTimeout: handleTimeout,
  });

  const submitAnswer = useCallback(
    (userAnswer: number) => {
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
          payload: {
            newScenario: generateAcaanScenario(stackOrderRef.current),
          },
        });
        eventBus.emit.ACAAN_ANSWER({
          correct: true,
          stackName: stackNameRef.current,
        });
        onAnswerRef.current?.({ correct: true, questionAdvanced: true });
      } else {
        // Simplified "Try again!" replaces the previous formatCutDepthMessage detail,
        // since users now retry the same question rather than advancing.
        notifications.show({
          color: "red",
          title: "Wrong answer",
          message: "Try again!",
          autoClose: NOTIFICATION_CLOSE_TIMEOUT,
        });
        dispatch({ type: "WRONG_ANSWER" });
        eventBus.emit.ACAAN_ANSWER({
          correct: false,
          stackName: stackNameRef.current,
        });
        onAnswerRef.current?.({ correct: false, questionAdvanced: false });
      }
    },
    [state.scenario.cardPosition, state.scenario.targetPosition]
  );

  const revealAnswer = useCallback(() => {
    const correctAnswer = calculateCutDepth(
      state.scenario.cardPosition,
      state.scenario.targetPosition
    );

    notifications.show({
      color: "yellow",
      title: "Answer",
      message: formatCutDepthMessage(
        state.scenario.cardPosition,
        state.scenario.targetPosition,
        correctAnswer
      ),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });

    dispatch({
      type: "REVEAL_ANSWER",
      payload: { newScenario: generateAcaanScenario(stackOrderRef.current) },
    });
    eventBus.emit.ACAAN_ANSWER({
      correct: false,
      stackName: stackNameRef.current,
    });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [state.scenario.cardPosition, state.scenario.targetPosition]);

  return {
    scenario: state.scenario,
    score: { successes: state.successes, fails: state.fails },
    timeRemaining: state.timeRemaining,
    timerEnabled: timerSettings.enabled,
    timerDuration: state.timerDuration,
    submitAnswer,
    revealAnswer,
  };
};
