import {
  getUniqueRandomCard,
  type PlayingCardPosition,
  type Stack,
} from "../../types/stacks";

export const addFourDistinctRandomCards = (
  stack: Stack,
  choices: PlayingCardPosition[] = []
): PlayingCardPosition[] => {
  if (choices.length >= 5) {
    return choices;
  }
  const cards = getUniqueRandomCard(stack, choices);
  return addFourDistinctRandomCards(stack, [cards, ...choices]);
};
