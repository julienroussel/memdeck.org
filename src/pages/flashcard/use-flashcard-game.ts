import { notifications } from "@mantine/notifications";
import { useReducer } from "react";
import { FLASHCARD_OPTION_LSK } from "../../constants";
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
import type { FlashcardMode } from "./flashcard-options";
import { getRandomDisplayMode, wrongAnswerNotification } from "./utils";

// --- Types ---

type DisplayMode = "card" | "index";

type GameState = {
  successes: number;
  fails: number;
  card: PlayingCardPosition;
  choices: PlayingCardPosition[];
  display: DisplayMode;
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
  | { type: "WRONG_ANSWER" };

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

const createInitialState = (stackOrder: Stack): GameState => {
  const { card, choices } = generateNewCardAndChoices(stackOrder);
  return {
    successes: 0,
    fails: 0,
    card,
    choices,
    display: "card",
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
      };
    case "WRONG_ANSWER":
      return {
        ...state,
        fails: state.fails + 1,
      };
    default:
      return state;
  }
};

// --- Hook ---

export const useFlashcardGame = (stackOrder: Stack, stackName: string) => {
  const [state, dispatch] = useReducer(
    gameReducer,
    stackOrder,
    createInitialState
  );
  const [mode] = useLocalDb<FlashcardMode>(FLASHCARD_OPTION_LSK, "bothmodes");

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

    // Lazy import analytics to avoid circular deps and keep hook testable
    import("../../services/analytics").then(({ analytics }) => {
      analytics.trackFlashcardAnswer(correct, stackName);
    });
  };

  const shouldShowCard =
    mode === "cardonly" || (mode === "bothmodes" && state.display === "card");

  return {
    score: { successes: state.successes, fails: state.fails },
    card: state.card,
    choices: state.choices,
    shouldShowCard,
    submitAnswer,
  };
};
