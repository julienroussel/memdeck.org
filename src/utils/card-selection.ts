import { DEFAULT_CHOICES_COUNT } from "../constants";
import type { StackLimits } from "../types/stack-limits";
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
 * @param limits - Position range to restrict card selection
 * @param initialChoices - Cards to include in the result (e.g., the target card)
 * @param totalChoices - Total number of choices to generate (default: DEFAULT_CHOICES_COUNT)
 * @returns Array of unique card positions
 */
export const generateUniqueCardChoices = (
  stack: Stack,
  limits: StackLimits,
  initialChoices: PlayingCardPosition[] = [],
  totalChoices = DEFAULT_CHOICES_COUNT
): PlayingCardPosition[] => {
  const rangeSize = limits.end - limits.start + 1;
  if (totalChoices > rangeSize) {
    throw new Error(
      `totalChoices (${totalChoices}) exceeds range size (${rangeSize})`
    );
  }
  const choices = [...initialChoices];

  while (choices.length < totalChoices) {
    const card = getUniqueRandomCard(stack, choices, limits);
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
 * @param limits - Position range to restrict card selection
 * @param totalChoices - Total number of choices to generate (default: DEFAULT_CHOICES_COUNT)
 * @returns Array of unique card positions including the answer but excluding the question
 */
export const generateNeighborChoices = (
  stack: Stack,
  answerCard: PlayingCardPosition,
  questionCard: PlayingCardPosition,
  limits: StackLimits,
  totalChoices = DEFAULT_CHOICES_COUNT
): PlayingCardPosition[] => {
  const rangeSize = limits.end - limits.start + 1;
  const effectivePool = rangeSize - 1; // question card is excluded
  if (totalChoices > effectivePool) {
    throw new Error(
      `totalChoices (${totalChoices}) exceeds available pool (${effectivePool}) in range ${limits.start}-${limits.end}`
    );
  }

  // Start with the answer card and the question card as "existing" to prevent
  // the question card from being picked as a distractor
  const excluded = [answerCard, questionCard];
  const choices = [answerCard];

  while (choices.length < totalChoices) {
    const card = getUniqueRandomCard(stack, excluded, limits);
    choices.push(card);
    excluded.push(card);
  }

  return choices;
};
