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

/**
 * Generates choices for neighbor mode, ensuring the answer is included
 * and the question card is excluded to avoid confusion.
 *
 * @param stack - The memorized deck stack to pick cards from
 * @param answerCard - The correct neighbor card (must be included)
 * @param questionCard - The card being shown as the prompt (must be excluded)
 * @param totalChoices - Total number of choices to generate (default: DEFAULT_CHOICES_COUNT)
 * @returns Array of unique card positions including the answer but excluding the question
 */
export const generateNeighborChoices = (
  stack: Stack,
  answerCard: PlayingCardPosition,
  questionCard: PlayingCardPosition,
  totalChoices = DEFAULT_CHOICES_COUNT
): PlayingCardPosition[] => {
  // Start with the answer card and the question card as "existing" to prevent
  // the question card from being picked as a distractor
  const excluded = [answerCard, questionCard];
  const choices = [answerCard];

  while (choices.length < totalChoices) {
    const card = getUniqueRandomCard(stack, excluded);
    choices.push(card);
    excluded.push(card);
  }

  return choices;
};
