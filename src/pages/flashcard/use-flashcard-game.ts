import { notifications } from "@mantine/notifications";
import { useState } from "react";
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

const generateNewCardAndChoices = (
  stackOrder: Stack
): { card: PlayingCardPosition; choices: PlayingCardPosition[] } => {
  const newCard = getRandomPlayingCard(stackOrder);
  const newChoices = shuffle(generateUniqueCardChoices(stackOrder, [newCard]));
  return { card: newCard, choices: newChoices };
};

const isCorrectAnswer = (
  item: PlayingCard | number,
  card: PlayingCardPosition
): boolean =>
  isPlayingCard(item)
    ? item.suit === card.card.suit && item.rank === card.card.rank
    : item === card.index;

export const useFlashcardGame = (stackOrder: Stack) => {
  const [successes, setSuccesses] = useState(0);
  const [fails, setFails] = useState(0);

  const initial = generateNewCardAndChoices(stackOrder);
  const [card, setCard] = useState<PlayingCardPosition>(initial.card);
  const [choices, setChoices] = useState<PlayingCardPosition[]>(
    initial.choices
  );

  const [display, setDisplay] = useState<"card" | "index">("card");
  const [mode] = useLocalDb<FlashcardMode>(FLASHCARD_OPTION_LSK, "bothmodes");

  const handleWrongAnswer = () => {
    notifications.show(wrongAnswerNotification);
    setFails((f) => f + 1);
  };

  const handleCorrectAnswer = () => {
    setSuccesses((s) => s + 1);

    const { card: newCard, choices: newChoices } =
      generateNewCardAndChoices(stackOrder);
    setCard(newCard);
    setChoices(newChoices);

    if (mode === "bothmodes") {
      setDisplay(getRandomDisplayMode());
    }
  };

  const submitAnswer = (item: PlayingCard | number) => {
    if (isCorrectAnswer(item, card)) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  const shouldShowCard =
    mode === "cardonly" || (mode === "bothmodes" && display === "card");

  return {
    score: { successes, fails },
    card,
    choices,
    shouldShowCard,
    submitAnswer,
  };
};
