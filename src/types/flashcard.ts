export const FLASHCARD_MODE_OPTIONS = [
  {
    value: "cardonly",
    label: "Card only",
    description:
      "In this mode, you'll see a card and need to guess its position in the stack from 5 options.",
  },
  {
    value: "bothmodes",
    label: "Both modes",
    description:
      "In this mode, you'll be randomly shown either a card or a number, guess its match from 5 options.",
  },
  {
    value: "numberonly",
    label: "Number only",
    description:
      "In this mode, you'll see a number and need to pick the corresponding card from 5 options.",
  },
] as const;

export type FlashcardMode = (typeof FLASHCARD_MODE_OPTIONS)[number]["value"];

export const isFlashcardMode = (value: string): value is FlashcardMode =>
  FLASHCARD_MODE_OPTIONS.some((opt) => opt.value === value);
