import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import { useGameTimer } from "../../hooks/use-game-timer";
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
import { formatCardName } from "../../utils/card-formatting";
import type { ResolvedDirection } from "../../utils/neighbor";
import type { AdvancePayload } from "./flashcard-game-reducer";
import {
  createInitialState,
  gameReducer,
  generateNeighborCardAndChoices,
  generateNewCardAndChoices,
  isCorrectAnswer,
} from "./flashcard-game-reducer";
import { getRandomDisplayMode, wrongAnswerNotification } from "./utils";

// --- Hook ---

type UseFlashcardGameOptions = {
  onAnswer?: (outcome: AnswerOutcome) => void;
};

type UseFlashcardGameResult = {
  score: GameScore;
  card: PlayingCardPosition;
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
      stackOrder,
      timerDuration: timerSettings.duration,
      mode,
      neighborDirection,
      limits,
    },
    ({
      stackOrder,
      timerDuration,
      mode: m,
      neighborDirection: nd,
      limits: l,
    }) =>
      m === "neighbor"
        ? createInitialState({
            stackOrder,
            timerDuration,
            flashcardMode: m,
            neighborDirection: nd,
            limits: l,
          })
        : createInitialState({
            stackOrder,
            timerDuration,
            flashcardMode: m,
            limits: l,
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
            type: "RESET_GAME",
            payload: {
              stackOrder,
              timerDuration: timerSettings.duration,
              flashcardMode: mode,
              neighborDirection,
              limits,
            },
          }
        : {
            type: "RESET_GAME",
            payload: {
              stackOrder,
              timerDuration: timerSettings.duration,
              flashcardMode: mode,
              limits,
            },
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
        newCard: result.card,
        newAnswerCard: result.answerCard,
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
      newCard,
      newAnswerCard: newCard,
      newChoices,
      newDisplay,
      newResolvedDirection: null,
    };
  }, []);

  const createTimeoutAction = useCallback(() => {
    const payload = generateNextRound();
    return { type: "TIMEOUT" as const, payload };
  }, [generateNextRound]);

  const handleTimeout = useCallback(() => {
    notifications.show({
      color: "red",
      title: t("flashcard.timesUp"),
      message: t("flashcard.movingToNext"),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
    eventBus.emit.FLASHCARD_ANSWER({ correct: false, stackName });
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
    (item: PlayingCard | number) => {
      const correct = isCorrectAnswer(item, answerCardRef.current);

      if (correct) {
        const payload = generateNextRound();
        dispatch({ type: "CORRECT_ANSWER", payload });
        onAnswerRef.current?.({ correct: true, questionAdvanced: true });
      } else {
        notifications.show(wrongAnswerNotification);
        dispatch({ type: "WRONG_ANSWER" });
        onAnswerRef.current?.({ correct: false, questionAdvanced: false });
      }

      eventBus.emit.FLASHCARD_ANSWER({ correct, stackName });
    },
    [stackName, generateNextRound]
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
      color: "yellow",
      title: t("flashcard.revealTitle"),
      message: revealMessage,
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });

    const payload = generateNextRound();
    dispatch({ type: "REVEAL_ANSWER", payload });
    eventBus.emit.FLASHCARD_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName, generateNextRound, t]);

  return {
    score: { successes: state.successes, fails: state.fails },
    card: state.card,
    choices: state.choices,
    shouldShowCard,
    timeRemaining: state.timeRemaining,
    timerDuration: state.timerDuration,
    isNeighborMode: mode === "neighbor",
    resolvedDirection: state.resolvedDirection,
    submitAnswer,
    revealAnswer,
  };
};
