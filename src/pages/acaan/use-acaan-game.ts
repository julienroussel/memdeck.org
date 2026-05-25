import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useGameTimer } from "../../hooks/use-game-timer";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import type { GameScore } from "../../types/game";
import type { AnswerOutcome } from "../../types/session";
import type { Stack, StackValue } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import type { AcaanScenario } from "../../utils/acaan-scenario";
import { generateAcaanScenario } from "../../utils/acaan-scenario";
import {
  createInitialState,
  formatCutDepth,
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
  timerDuration: number;
  submitAnswer: (userAnswer: number) => void;
  revealAnswer: () => void;
};

export const useAcaanGame = (
  stackOrder: Stack,
  stackName: StackValue["name"],
  timerSettings: TimerSettings,
  options?: UseAcaanGameOptions
): UseAcaanGameResult => {
  const { t } = useTranslation();

  // Refs let callbacks below read the latest stackOrder/stackName without
  // being re-created when those props change.
  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;
  const stackNameRef = useRef(stackName);
  stackNameRef.current = stackName;

  const onAnswerRef = useRef(options?.onAnswer);
  onAnswerRef.current = options?.onAnswer;

  const [state, dispatch] = useReducer(
    gameReducer,
    { stackOrder, timerDuration: timerSettings.duration },
    ({ stackOrder: s, timerDuration }) => createInitialState(s, timerDuration)
  );

  // Reset synchronously when the stack changes. Inline "store previous props"
  // pattern, mirroring flashcard and distance — avoids the useEffect flicker
  // a deferred reset would introduce.
  const prevStackOrderRef = useRef(stackOrder);
  if (prevStackOrderRef.current !== stackOrder) {
    prevStackOrderRef.current = stackOrder;
    dispatch({
      type: "RESET_GAME",
      payload: { stackOrder, timerDuration: timerSettings.duration },
    });
  }

  const buildCutDepthMessage = useCallback(
    (scenario: AcaanScenario): string => {
      const cutDepth = getCurrentCutDepth(scenario);
      return t("acaan.cutDepthMessage", {
        from: scenario.cardPosition,
        to: scenario.targetPosition,
        cutDepth: formatCutDepth(cutDepth, t("acaan.cutDepthZero")),
      });
    },
    [t]
  );

  const createTimeoutAction = useCallback(
    () => ({
      type: "TIMEOUT" as const,
      payload: { newScenario: generateAcaanScenario(stackOrderRef.current) },
    }),
    []
  );

  const handleTimeout = useCallback(() => {
    notifications.show({
      color: "red",
      title: t("acaan.timesUp"),
      message: buildCutDepthMessage(state.scenario),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
    eventBus.emit.ACAAN_ANSWER({
      correct: false,
      stackName: stackNameRef.current,
    });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [buildCutDepthMessage, state.scenario, t]);

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
          title: t("acaan.correctTitle"),
          message: buildCutDepthMessage(state.scenario),
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
          title: t("acaan.wrongTitle"),
          message: t("acaan.wrongMessage"),
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
    [state.scenario, buildCutDepthMessage, t]
  );

  const revealAnswer = useCallback(() => {
    notifications.show({
      color: "yellow",
      title: t("acaan.revealTitle"),
      message: buildCutDepthMessage(state.scenario),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });

    dispatch({
      type: "REVEAL_ANSWER",
      payload: { newScenario: generateAcaanScenario(stackOrderRef.current) },
    });
    analytics.trackFeatureUsed("Reveal Answer - ACAAN");
    eventBus.emit.ACAAN_ANSWER({
      correct: false,
      stackName: stackNameRef.current,
    });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [buildCutDepthMessage, state.scenario, t]);

  return {
    scenario: state.scenario,
    score: { successes: state.successes, fails: state.fails },
    timeRemaining: state.timeRemaining,
    timerDuration: state.timerDuration,
    submitAnswer,
    revealAnswer,
  };
};
