import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";
import { useGameTimer } from "../../hooks/use-game-timer";
import { useResetGameOnStackChange } from "../../hooks/use-reset-game-on-stack-change";
import { eventBus } from "../../services/event-bus";
import type { GameScore } from "../../types/game";
import type { AnswerOutcome } from "../../types/session";
import type { Stack, StackValue } from "../../types/stacks";
import type { AcaanScenario } from "../../utils/acaan-scenario";
import { generateAcaanScenario } from "../../utils/acaan-scenario";
import {
  createInitialState,
  formatCutDepthMessage,
  gameReducer,
  getCurrentCutDepth,
} from "./acaan-game-reducer";

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
    () => ({
      type: "TIMEOUT" as const,
      payload: { newScenario: generateAcaanScenario(stackOrderRef.current) },
    }),
    []
  );

  const handleTimeout = useCallback(() => {
    const cutDepth = getCurrentCutDepth(state.scenario);

    notifications.show({
      color: "red",
      title: "Time's up!",
      message: formatCutDepthMessage(
        state.scenario.cardPosition,
        state.scenario.targetPosition,
        cutDepth
      ),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
    eventBus.emit.ACAAN_ANSWER({
      correct: false,
      stackName: stackNameRef.current,
    });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [state.scenario]);

  useGameTimer({
    timerSettings,
    timeRemaining: state.timeRemaining,
    dispatch,
    createTimeoutAction,
    onTimeout: handleTimeout,
  });

  const submitAnswer = useCallback(
    (userAnswer: number) => {
      const cutDepth = getCurrentCutDepth(state.scenario);
      const isCorrect = userAnswer === cutDepth;

      if (isCorrect) {
        notifications.show({
          color: "green",
          title: "Correct!",
          message: formatCutDepthMessage(
            state.scenario.cardPosition,
            state.scenario.targetPosition,
            cutDepth
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
    [state.scenario]
  );

  const revealAnswer = useCallback(() => {
    const cutDepth = getCurrentCutDepth(state.scenario);

    notifications.show({
      color: "yellow",
      title: "Answer",
      message: formatCutDepthMessage(
        state.scenario.cardPosition,
        state.scenario.targetPosition,
        cutDepth
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
  }, [state.scenario]);

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
