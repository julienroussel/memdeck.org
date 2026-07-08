import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useFormatCardName } from "../../hooks/use-format-card-name";
import { useGameTimer } from "../../hooks/use-game-timer";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import type { GameScore } from "../../types/game";
import type { PlayingCard } from "../../types/playingcard";
import type { AnswerOutcome } from "../../types/session";
import type { StackLimits } from "../../types/stack-limits";
import type {
  PlayingCardPosition,
  Stack,
  StackValue,
} from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import type { ResolvedDirection } from "../../utils/neighbor";
import { buildWrongAnswerNotification } from "../../utils/notifications";
import type { AdvancePayload } from "./flashcard-game-reducer";
import {
  createInitialState,
  gameReducer,
  generateNeighborCardAndChoices,
  generateNewCardAndChoices,
  isCorrectAnswer,
} from "./flashcard-game-reducer";
import { getRandomDisplayMode } from "./utils";

// --- Hook ---

type UseFlashcardGameOptions = {
  onAnswer?: (outcome: AnswerOutcome) => void;
};

type UseFlashcardGameResult = {
  score: GameScore;
  card: PlayingCardPosition;
  /** The card the user must select as the answer. Same as `card` for standard modes. */
  answerCard: PlayingCardPosition;
  choices: PlayingCardPosition[];
  shouldShowCard: boolean;
  timeRemaining: number;
  timerDuration: number;
  isNeighborMode: boolean;
  resolvedDirection: ResolvedDirection | null;
  submitAnswer: (item: PlayingCard | number) => void;
  revealAnswer: () => void;
};

export const useFlashcardGame = (
  stackOrder: Stack,
  stackName: StackValue["name"],
  mode: FlashcardMode,
  neighborDirection: NeighborDirection,
  timerSettings: TimerSettings,
  limits: StackLimits,
  options?: UseFlashcardGameOptions
): UseFlashcardGameResult => {
  const { t } = useTranslation();
  const formatCardName = useFormatCardName();

  const onAnswerRef = useRef(options?.onAnswer);
  onAnswerRef.current = options?.onAnswer;

  // Use refs to access latest values in callbacks without adding to dependencies
  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const neighborDirectionRef = useRef(neighborDirection);
  neighborDirectionRef.current = neighborDirection;

  const limitsRef = useRef(limits);
  limitsRef.current = limits;

  const [state, dispatch] = useReducer(
    gameReducer,
    {
      limits,
      mode,
      neighborDirection,
      stackOrder,
      timerDuration: timerSettings.duration,
    },
    ({
      stackOrder: so,
      timerDuration,
      mode: m,
      neighborDirection: nd,
      limits: l,
    }) =>
      m === "neighbor"
        ? createInitialState({
            flashcardMode: m,
            limits: l,
            neighborDirection: nd,
            stackOrder: so,
            timerDuration,
          })
        : createInitialState({
            flashcardMode: m,
            limits: l,
            stackOrder: so,
            timerDuration,
          })
  );

  // Reset game synchronously when stack, mode, direction, or limits change.
  // This uses React's "store previous props" pattern to avoid the flicker
  // caused by useEffect (which fires after render, committing an intermediate
  // state with stale choices to the DOM).
  const prevStackOrderRef = useRef(stackOrder);
  const prevModeRef = useRef(mode);
  const prevDirectionRef = useRef(neighborDirection);
  const prevLimitsRef = useRef(limits);

  const stackChanged = prevStackOrderRef.current !== stackOrder;
  const modeChanged = prevModeRef.current !== mode;
  const directionChanged = prevDirectionRef.current !== neighborDirection;
  const limitsChanged =
    prevLimitsRef.current.start !== limits.start ||
    prevLimitsRef.current.end !== limits.end;

  // Note: timerSettings.duration is intentionally excluded from change detection.
  // Duration changes are handled by useGameTimer via the RESET_TIMER action.
  if (stackChanged || modeChanged || directionChanged || limitsChanged) {
    prevStackOrderRef.current = stackOrder;
    prevModeRef.current = mode;
    prevDirectionRef.current = neighborDirection;
    prevLimitsRef.current = limits;
    dispatch(
      mode === "neighbor"
        ? {
            payload: {
              flashcardMode: mode,
              limits,
              neighborDirection,
              stackOrder,
              timerDuration: timerSettings.duration,
            },
            type: "RESET_GAME",
          }
        : {
            payload: {
              flashcardMode: mode,
              limits,
              stackOrder,
              timerDuration: timerSettings.duration,
            },
            type: "RESET_GAME",
          }
    );
  }

  const displayRef = useRef(state.display);
  displayRef.current = state.display;

  const answerCardRef = useRef(state.answerCard);
  answerCardRef.current = state.answerCard;

  const generateNextRound = useCallback((): AdvancePayload => {
    if (modeRef.current === "neighbor") {
      const result = generateNeighborCardAndChoices(
        stackOrderRef.current,
        neighborDirectionRef.current,
        limitsRef.current
      );
      return {
        newAnswerCard: result.answerCard,
        newCard: result.card,
        newChoices: result.choices,
        newDisplay: "card",
        newResolvedDirection: result.resolvedDirection,
      };
    }
    const { card: newCard, choices: newChoices } = generateNewCardAndChoices(
      stackOrderRef.current,
      limitsRef.current
    );
    const newDisplay =
      modeRef.current === "bothmodes"
        ? getRandomDisplayMode()
        : displayRef.current;
    return {
      newAnswerCard: newCard,
      newCard,
      newChoices,
      newDisplay,
      newResolvedDirection: null,
    };
  }, []);

  const createTimeoutAction = useCallback(() => {
    const payload = generateNextRound();
    return { payload, type: "TIMEOUT" as const };
  }, [generateNextRound]);

  const handleTimeout = useCallback(() => {
    notifications.show({
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      color: "red",
      message: t("flashcard.movingToNext"),
      title: t("flashcard.timesUp"),
    });
    eventBus.emit.FLASHCARD_ANSWER({ correct: false, stackName });
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
    (item: PlayingCard | number) => {
      const correct = isCorrectAnswer(item, answerCardRef.current);

      if (correct) {
        const payload = generateNextRound();
        dispatch({ payload, type: "CORRECT_ANSWER" });
        onAnswerRef.current?.({ correct: true, questionAdvanced: true });
      } else {
        notifications.show(buildWrongAnswerNotification(t));
        dispatch({ type: "WRONG_ANSWER" });
        onAnswerRef.current?.({ correct: false, questionAdvanced: false });
      }

      eventBus.emit.FLASHCARD_ANSWER({ correct, stackName });
    },
    [stackName, generateNextRound, t]
  );

  const shouldShowCard =
    mode === "cardonly" ||
    mode === "neighbor" ||
    (mode === "bothmodes" && state.display === "card");

  const revealAnswer = useCallback(() => {
    const currentAnswerCard = answerCardRef.current;
    const isNeighbor = modeRef.current === "neighbor";
    const currentShouldShowCard =
      modeRef.current === "cardonly" ||
      isNeighbor ||
      (modeRef.current === "bothmodes" && displayRef.current === "card");

    const isCardAnswer = !currentShouldShowCard || isNeighbor;
    const revealMessage = isCardAnswer
      ? formatCardName(currentAnswerCard.card)
      : String(currentAnswerCard.index);

    notifications.show({
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      color: "yellow",
      message: revealMessage,
      title: t("flashcard.revealTitle"),
    });

    const payload = generateNextRound();
    dispatch({ payload, type: "REVEAL_ANSWER" });
    analytics.trackFeatureUsed("Reveal Answer - Flashcard");
    eventBus.emit.FLASHCARD_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName, generateNextRound, t, formatCardName]);

  return {
    answerCard: state.answerCard,
    card: state.card,
    choices: state.choices,
    isNeighborMode: mode === "neighbor",
    resolvedDirection: state.resolvedDirection,
    revealAnswer,
    score: { fails: state.fails, successes: state.successes },
    shouldShowCard,
    submitAnswer,
    timeRemaining: state.timeRemaining,
    timerDuration: state.timerDuration,
  };
};
