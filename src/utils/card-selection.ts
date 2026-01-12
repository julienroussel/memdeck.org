import { DEFAULT_CHOICES_COUNT } from "../constants";
import {
  getUniqueRandomCard,
  type PlayingCardPosition,
  type Stack,
} from "../types/stacks";

/**
 * Generates a set of unique card choices from a stack.
 * Used to create multiple-choice options for flashcard exercises.
 *
 * @param stack - The memorized deck stack to pick cards from
 * @param initialChoices - Cards to include in the result (e.g., the target card)
 * @param totalChoices - Total number of choices to generate (default: DEFAULT_CHOICES_COUNT)
 * @returns Array of unique card positions
 */
export const generateUniqueCardChoices = (
  stack: Stack,
  initialChoices: PlayingCardPosition[] = [],
  totalChoices = DEFAULT_CHOICES_COUNT
): PlayingCardPosition[] => {
  const choices = [...initialChoices];

  while (choices.length < totalChoices) {
    const card = getUniqueRandomCard(stack, choices);
    choices.push(card);
  }

  return choices;
};
