import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import {
  FLASHCARD_OPTION_LSK,
  NOTIFICATION_CLOSE_TIMEOUT,
} from "../../constants";
import { useFlashcardTimer } from "../../hooks/use-flashcard-timer";
import { useGameTimer } from "../../hooks/use-game-timer";
import { useResetGameOnStackChange } from "../../hooks/use-reset-game-on-stack-change";
import { eventBus } from "../../services/event-bus";
import type { FlashcardMode } from "../../types/flashcard";
import type { GameScore } from "../../types/game";
import type { PlayingCard } from "../../types/playingcard";
import type { AnswerOutcome } from "../../types/session";
import type {
  PlayingCardPosition,
  Stack,
  StackValue,
} from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";
import { useLocalDb } from "../../utils/localstorage";
import {
  createInitialState,
  gameReducer,
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
  timerEnabled: boolean;
  timerDuration: number;
  submitAnswer: (item: PlayingCard | number) => void;
  revealAnswer: () => void;
};

export const useFlashcardGame = (
  stackOrder: Stack,
  stackName: StackValue["name"],
  options?: UseFlashcardGameOptions
): UseFlashcardGameResult => {
  const onAnswerRef = useRef(options?.onAnswer);
  onAnswerRef.current = options?.onAnswer;
  const { timerSettings } = useFlashcardTimer();
  const [mode] = useLocalDb<FlashcardMode>(FLASHCARD_OPTION_LSK, "bothmodes");

  // Use refs to access latest values in callbacks without adding to dependencies
  const stackOrderRef = useRef(stackOrder);
  stackOrderRef.current = stackOrder;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [state, dispatch] = useReducer(
    gameReducer,
    { stackOrder, timerDuration: timerSettings.duration },
    ({ stackOrder, timerDuration }) =>
      createInitialState(stackOrder, timerDuration)
  );

  useResetGameOnStackChange(stackOrder, timerSettings.duration, dispatch);

  const displayRef = useRef(state.display);
  displayRef.current = state.display;

  const cardRef = useRef(state.card);
  cardRef.current = state.card;

  const createTimeoutAction = useCallback(() => {
    const { card: newCard, choices: newChoices } = generateNewCardAndChoices(
      stackOrderRef.current
    );
    const newDisplay =
      modeRef.current === "bothmodes"
        ? getRandomDisplayMode()
        : displayRef.current;
    return {
      type: "TIMEOUT" as const,
      payload: { newCard, newChoices, newDisplay },
    };
  }, []);

  const handleTimeout = useCallback(() => {
    notifications.show({
      color: "red",
      title: "Time's up!",
      message: "Moving to the next card.",
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
    eventBus.emit.FLASHCARD_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName]);

  useGameTimer({
    timerSettings,
    timeRemaining: state.timeRemaining,
    dispatch,
    createTimeoutAction,
    onTimeout: handleTimeout,
  });

  const submitAnswer = useCallback(
    (item: PlayingCard | number) => {
      const correct = isCorrectAnswer(item, cardRef.current);

      if (correct) {
        const { card: newCard, choices: newChoices } =
          generateNewCardAndChoices(stackOrderRef.current);
        const newDisplay =
          modeRef.current === "bothmodes"
            ? getRandomDisplayMode()
            : displayRef.current;

        dispatch({
          type: "CORRECT_ANSWER",
          payload: { newCard, newChoices, newDisplay },
        });
        onAnswerRef.current?.({ correct: true, questionAdvanced: true });
      } else {
        notifications.show(wrongAnswerNotification);
        dispatch({ type: "WRONG_ANSWER" });
        onAnswerRef.current?.({ correct: false, questionAdvanced: false });
      }

      eventBus.emit.FLASHCARD_ANSWER({ correct, stackName });
    },
    [stackName]
  );

  const shouldShowCard =
    mode === "cardonly" || (mode === "bothmodes" && state.display === "card");

  const revealAnswer = useCallback(() => {
    const currentCard = cardRef.current;
    const currentShouldShowCard =
      modeRef.current === "cardonly" ||
      (modeRef.current === "bothmodes" && displayRef.current === "card");

    notifications.show({
      color: "yellow",
      title: "Answer",
      message: currentShouldShowCard
        ? String(currentCard.index)
        : formatCardName(currentCard.card),
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });

    const { card: newCard, choices: newChoices } = generateNewCardAndChoices(
      stackOrderRef.current
    );
    const newDisplay =
      modeRef.current === "bothmodes"
        ? getRandomDisplayMode()
        : displayRef.current;

    dispatch({
      type: "REVEAL_ANSWER",
      payload: { newCard, newChoices, newDisplay },
    });
    eventBus.emit.FLASHCARD_ANSWER({ correct: false, stackName });
    onAnswerRef.current?.({ correct: false, questionAdvanced: true });
  }, [stackName]);

  return {
    score: { successes: state.successes, fails: state.fails },
    card: state.card,
    choices: state.choices,
    shouldShowCard,
    timeRemaining: state.timeRemaining,
    timerEnabled: timerSettings.enabled,
    timerDuration: state.timerDuration,
    submitAnswer,
    revealAnswer,
  };
};
