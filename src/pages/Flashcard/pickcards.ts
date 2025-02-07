import {
  getUniqueRandomCard,
  PlayingCardPosition,
  Stack,
} from '../../types/stacks';

export const addFourDistinctRandomCards = (
  stack: Stack,
  choices: PlayingCardPosition[] = [],
): PlayingCardPosition[] => {
  if (choices.length >= 5) {
    return choices;
  }
  return addFourDistinctRandomCards(stack, [
    getUniqueRandomCard(stack, choices),
    ...choices,
  ]);
};
