import { notifications } from "@mantine/notifications";
import { useCallback, useReducer, useRef } from "react";
import {
  FLASHCARD_OPTION_LSK,
  NOTIFICATION_CLOSE_TIMEOUT,
} from "../../constants";
import { useFlashcardTimer } from "../../hooks/use-flashcard-timer";
import { timerReducerCases, useGameTimer } from "../../hooks/use-game-timer";
import { eventBus } from "../../services/event-bus";
import type { FlashcardMode } from "../../types/flashcard";
import type { PlayingCard } from "../../types/playingcard";
import { shuffle } from "../../types/shuffle";
import {
  getRandomPlayingCard,
  type PlayingCardPosition,
  type Stack,
} from "../../types/stacks";
import { isPlayingCard } from "../../types/typeguards";
import { generateUniqueCardChoices } from "../../utils/card-selection";
import { useLocalDb } from "../../utils/localstorage";
import {
  type DisplayMode,
  getRandomDisplayMode,
  wrongAnswerNotification,
} from "./utils";

// --- Types ---

type GameState = {
  successes: number;
  fails: number;
  card: PlayingCardPosition;
  choices: PlayingCardPosition[];
  display: DisplayMode;
  timeRemaining: number;
  timerDuration: number;
};

type TimeoutAction = {
  type: "TIMEOUT";
  payload: {
    newCard: PlayingCardPosition;
    newChoices: PlayingCardPosition[];
    newDisplay: DisplayMode;
  };
};

type GameAction =
  | {
      type: "CORRECT_ANSWER";
      payload: {
        newCard: PlayingCardPosition;
        newChoices: PlayingCardPosition[];
        newDisplay: DisplayMode;
      };
    }
  | { type: "WRONG_ANSWER" }
  | TimeoutAction
  | { type: "TICK" }
  | { type: "RESET_TIMER"; payload: { duration: number } };

// --- Pure Functions ---

export const generateNewCardAndChoices = (
  stackOrder: Stack
): { card: PlayingCardPosition; choices: PlayingCardPosition[] } => {
  const newCard = getRandomPlayingCard(stackOrder);
  const newChoices = shuffle(generateUniqueCardChoices(stackOrder, [newCard]));
  return { card: newCard, choices: newChoices };
};

export const isCorrectAnswer = (
  item: PlayingCard | number,
  card: PlayingCardPosition
): boolean =>
  isPlayingCard(item)
    ? item.suit === card.card.suit && item.rank === card.card.rank
    : item === card.index;

const createInitialState = (
  stackOrder: Stack,
  timerDuration: number
): GameState => {
  const { card, choices } = generateNewCardAndChoices(stackOrder);
  return {
    successes: 0,
    fails: 0,
    card,
    choices,
    display: "card",
    timeRemaining: timerDuration,
    timerDuration,
  };
};

// --- Reducer ---

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "CORRECT_ANSWER":
      return {
        ...state,
        successes: state.successes + 1,
        card: action.payload.newCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
        timeRemaining: state.timerDuration,
      };
    // Note: WRONG_ANSWER intentionally does NOT reset the timer or advance to next card.
    // This allows users to retry the same card until they get it right or time runs out.
    // This differs from ACAAN where every answer (correct/wrong/timeout) advances.
    case "WRONG_ANSWER":
      return {
        ...state,
        fails: state.fails + 1,
      };
    case "TIMEOUT":
      return {
        ...state,
        fails: state.fails + 1,
        card: action.payload.newCard,
        choices: action.payload.newChoices,
        display: action.payload.newDisplay,
        timeRemaining: state.timerDuration,
      };
    case "TICK":
      return timerReducerCases.TICK(state);
    case "RESET_TIMER":
      return timerReducerCases.RESET_TIMER(state, action.payload.duration);
    default:
      return state;
  }
};

// --- Hook ---

type UseFlashcardGameResult = {
  score: { successes: number; fails: number };
  card: PlayingCardPosition;
  choices: PlayingCardPosition[];
  shouldShowCard: boolean;
  timeRemaining: number;
  timerEnabled: boolean;
  timerDuration: number;
  submitAnswer: (item: PlayingCard | number) => void;
};

export const useFlashcardGame = (
  stackOrder: Stack,
  stackName: string
): UseFlashcardGameResult => {
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

  // Memoize dispatch to satisfy useGameTimer's stable reference requirement
  const stableDispatch = useCallback(
    (action: GameAction) => dispatch(action),
    []
  );

  const createTimeoutAction = useCallback((): TimeoutAction => {
    const { card: newCard, choices: newChoices } = generateNewCardAndChoices(
      stackOrderRef.current
    );
    const newDisplay =
      modeRef.current === "bothmodes" ? getRandomDisplayMode() : state.display;
    return {
      type: "TIMEOUT",
      payload: { newCard, newChoices, newDisplay },
    };
  }, [state.display]);

  const handleTimeout = useCallback(() => {
    notifications.show({
      color: "red",
      title: "Time's up!",
      message: "Moving to the next card.",
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
    eventBus.emit.FLASHCARD_ANSWER({ correct: false, stackName });
  }, [stackName]);

  useGameTimer({
    timerSettings,
    timeRemaining: state.timeRemaining,
    dispatch: stableDispatch,
    createTimeoutAction,
    onTimeout: handleTimeout,
  });

  const submitAnswer = (item: PlayingCard | number) => {
    const correct = isCorrectAnswer(item, state.card);

    if (correct) {
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(stackOrder);
      const newDisplay =
        mode === "bothmodes" ? getRandomDisplayMode() : state.display;

      dispatch({
        type: "CORRECT_ANSWER",
        payload: { newCard, newChoices, newDisplay },
      });
    } else {
      notifications.show(wrongAnswerNotification);
      dispatch({ type: "WRONG_ANSWER" });
    }

    eventBus.emit.FLASHCARD_ANSWER({ correct, stackName });
  };

  const shouldShowCard =
    mode === "cardonly" || (mode === "bothmodes" && state.display === "card");

  return {
    score: { successes: state.successes, fails: state.fails },
    card: state.card,
    choices: state.choices,
    shouldShowCard,
    timeRemaining: state.timeRemaining,
    timerEnabled: timerSettings.enabled,
    timerDuration: state.timerDuration,
    submitAnswer,
  };
};
