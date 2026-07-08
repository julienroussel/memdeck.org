import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useFormatCardName } from "../../hooks/use-format-card-name";
import { useGameTimer } from "../../hooks/use-game-timer";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import type { DistanceConvention, DistanceMode } from "../../types/distance";
import type { GameScore } from "../../types/game";
import type { AnswerOutcome } from "../../types/session";
import type { StackLimits } from "../../types/stack-limits";
import type {
  PlayingCardPosition,
  Stack,
  StackValue,
} from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import { buildWrongAnswerNotification } from "../../utils/notifications";
import {
  type AdvancePayload,
  createInitialState,
  type DistanceAnswer,
  type DistanceRound,
  gameReducer,
  generateNextDistanceRound,
  isCorrectAnswer,
} from "./distance-game-reducer";

type UseDistanceGameOptions = {
  onAnswer?: (outcome: AnswerOutcome) => void;
};

type UseDistanceGameResult = {
  score: GameScore;
  card: PlayingCardPosition;
  /**
   * The round-shaped fields, discriminated by `display`. Compute rounds carry
   * `expectedDistance` and numeric choices; Apply rounds carry `offset` and
   * card choices; a `range-too-small` round carries no prompt data.
   */
  round: DistanceRound;
  convention: DistanceConvention;
  timeRemaining: number;
  timerDuration: number;
  submitAnswer: (answer: DistanceAnswer) => void;
  revealAnswer: () => void;
};

export const useDistanceGame = (
  stackOrder: Stack,
  stackName: StackValue["name"],
  mode: DistanceMode,
  convention: DistanceConvention,
  timerSettings: TimerSettings,
  limits: StackLimits,
  options?: UseDistanceGameOptions
): UseDistanceGameResult => {
  const { t } = useTranslation();
  const formatCardName = useFormatCardName();

  const onAnswerRef = useRef(options?.onAnswer);
  onAnswerRef.current = options?.onAnswer;

  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const conventionRef = useRef(convention);
  conventionRef.current = convention;

  const limitsRef = useRef(limits);
  limitsRef.current = limits;

  const [state, dispatch] = useReducer(
    gameReducer,
    {
      convention,
      distanceMode: mode,
      limits,
      stackOrder,
      timerDuration: timerSettings.duration,
    },
    createInitialState
  );

  // Reset synchronously when stack, mode, convention, or limits change.
  // Same "store previous props" pattern as flashcard.
  //
  // When `limits` changes mid-session, this RESET wipes the in-game
  // successes/fails counter and draws a fresh round, while `useSession`
  // independently re-snapshots the active session's stackLimits (see
  // src/hooks/use-session.ts) so cumulative session counters carry over
  // under the new range. Two coordinated side effects from one user action
  // — keep them in sync if either changes.
  const prevStackOrderRef = useRef(stackOrder);
  const prevModeRef = useRef(mode);
  const prevConventionRef = useRef(convention);
  const prevLimitsRef = useRef(limits);

  const stackChanged = prevStackOrderRef.current !== stackOrder;
  const modeChanged = prevModeRef.current !== mode;
  const conventionChanged = prevConventionRef.current !== convention;
  const limitsChanged =
    prevLimitsRef.current.start !== limits.start ||
    prevLimitsRef.current.end !== limits.end;

  if (stackChanged || modeChanged || conventionChanged || limitsChanged) {
    prevStackOrderRef.current = stackOrder;
    prevModeRef.current = mode;
    prevConventionRef.current = convention;
    prevLimitsRef.current = limits;
    dispatch({
      payload: {
        convention,
        distanceMode: mode,
        limits,
        stackOrder,
        timerDuration: timerSettings.duration,
      },
      type: "RESET_GAME",
    });
  }

  // Snapshot the current round so submitAnswer/revealAnswer can read it
  // without subscribing to it (keeps callbacks stable).
  const roundRef = useRef<DistanceRound>(state);
  roundRef.current = state;

  const generateNextRound = useCallback(
    (): AdvancePayload =>
      generateNextDistanceRound(
        stackOrderRef.current,
        modeRef.current,
        conventionRef.current,
        limitsRef.current
      ),
    []
  );

  const createTimeoutAction = useCallback(() => {
    const payload = generateNextRound();
    return { payload, type: "TIMEOUT" as const };
  }, [generateNextRound]);

  const handleTimeout = useCallback(() => {
    notifications.show({
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      color: "red",
      message: t("distance.movingToNext"),
      title: t("distance.timesUp"),
    });
    eventBus.emit.DISTANCE_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName, t]);

  useGameTimer({
    createTimeoutAction,
    dispatch,
    onTimeout: handleTimeout,
    timeRemaining: state.timeRemaining,
    timerSettings,
  });

  const submitAnswer = useCallback(
    (answer: DistanceAnswer) => {
      const correct = isCorrectAnswer(answer, roundRef.current);

      if (correct) {
        const payload = generateNextRound();
        dispatch({ payload, type: "CORRECT_ANSWER" });
        onAnswerRef.current?.({ correct: true, questionAdvanced: true });
      } else {
        notifications.show(buildWrongAnswerNotification(t));
        dispatch({ type: "WRONG_ANSWER" });
        onAnswerRef.current?.({ correct: false, questionAdvanced: false });
      }

      eventBus.emit.DISTANCE_ANSWER({ correct, stackName });
    },
    [stackName, generateNextRound, t]
  );

  const revealAnswer = useCallback(() => {
    const round = roundRef.current;
    // A range-too-small round has no answer to reveal (the page hides the
    // reveal button in that state).
    if (round.display === "range-too-small") {
      return;
    }
    const revealMessage =
      round.display === "apply"
        ? formatCardName(round.answerCard.card)
        : String(round.expectedDistance);

    notifications.show({
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      color: "yellow",
      message: revealMessage,
      title: t("distance.revealTitle"),
    });

    const payload = generateNextRound();
    dispatch({ payload, type: "REVEAL_ANSWER" });
    analytics.trackFeatureUsed("Reveal Answer - Distance");
    eventBus.emit.DISTANCE_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName, generateNextRound, t, formatCardName]);

  return {
    card: state.card,
    convention: state.convention,
    revealAnswer,
    round: state,
    score: { fails: state.fails, successes: state.successes },
    submitAnswer,
    timeRemaining: state.timeRemaining,
    timerDuration: state.timerDuration,
  };
};
