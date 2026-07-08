import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useGameTimer } from "../../hooks/use-game-timer";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import type { GameScore } from "../../types/game";
import type { PlayingCard } from "../../types/playingcard";
import type { AnswerOutcome } from "../../types/session";
import type { SpotCheckMode } from "../../types/spot-check";
import type { StackLimits } from "../../types/stack-limits";
import type { Stack, StackValue } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import {
  type AdvancePayload,
  createInitialState,
  gameReducer,
  generatePuzzle,
  getCardsForPuzzle,
} from "./spot-check-game-reducer";
import { isSpotCheckAnswerCorrect, type PuzzleState } from "./utils";

// Fixed id so repeated Reveal taps replace the pinned toast instead of
// stacking permanently-open notifications (Mantine shows at most 5).
const SPOT_CHECK_REVEAL_NOTIFICATION_ID = "spot-check-reveal";

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
      limits,
      mode: spotCheckMode,
      stackOrder,
      timerDuration: timerSettings.duration,
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
      payload: {
        cards: cardsRef.current,
        spotCheckMode,
        timerDuration: timerSettings.duration,
      },
      type: "RESET_GAME",
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
    return { payload, type: "TIMEOUT" as const };
  }, [generateNextRound]);

  const handleTimeout = useCallback(() => {
    notifications.show({
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      color: "red",
      message: t("spotCheck.movingToNext"),
      title: t("spotCheck.timesUp"),
    });
    eventBus.emit.SPOT_CHECK_ANSWER({ correct: false, stackName });
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
    (card: PlayingCard, index: number) => {
      const correct = isSpotCheckAnswerCorrect(
        card,
        index,
        puzzleStateRef.current,
        cardsRef.current
      );

      if (correct) {
        notifications.show({
          autoClose: NOTIFICATION_CLOSE_TIMEOUT,
          color: "green",
          message: "",
          title: t("spotCheck.correctAnswer"),
        });
        const payload = generateNextRound();
        dispatch({ payload, type: "CORRECT_ANSWER" });
        onAnswerRef.current?.({ correct: true, questionAdvanced: true });
      } else {
        notifications.show({
          autoClose: NOTIFICATION_CLOSE_TIMEOUT,
          color: "red",
          message: "",
          title: t("spotCheck.wrongAnswer"),
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

    // show() is a no-op while a same-id toast is visible — hide first so only
    // the latest reveal stays pinned.
    notifications.hide(SPOT_CHECK_REVEAL_NOTIFICATION_ID);
    notifications.show({
      // Position details take time to read — keep the notification open until
      // the user dismisses it (WCAG 2.2 SC 2.2.1 Timing Adjustable).
      autoClose: false,
      color: "yellow",
      id: SPOT_CHECK_REVEAL_NOTIFICATION_ID,
      message: revealMessage,
      title: t("spotCheck.revealTitle"),
      withCloseButton: true,
    });

    const payload = generateNextRound();
    dispatch({ payload, type: "REVEAL_ANSWER" });
    analytics.trackFeatureUsed("Reveal Answer - Spot Check");
    eventBus.emit.SPOT_CHECK_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName, generateNextRound, t]);

  return {
    puzzleCards: state.puzzleState.puzzle.cards,
    puzzleState: state.puzzleState,
    revealAnswer,
    score: { fails: state.fails, successes: state.successes },
    submitAnswer,
    timeRemaining: state.timeRemaining,
    timerDuration: state.timerDuration,
  };
};
