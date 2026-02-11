import type en from "../i18n/locales/en.json";

/** Valid i18n keys for flashcard-related translations, derived from en.json */
type FlashcardI18nKey = `flashcard.${keyof (typeof en)["flashcard"] & string}`;

export const FLASHCARD_MODE_OPTIONS = [
  {
    value: "cardonly",
    labelKey: "flashcard.modeCardOnly",
    descriptionKey: "flashcard.modeCardOnlyDescription",
  },
  {
    value: "bothmodes",
    labelKey: "flashcard.modeBothModes",
    descriptionKey: "flashcard.modeBothModesDescription",
  },
  {
    value: "numberonly",
    labelKey: "flashcard.modeNumberOnly",
    descriptionKey: "flashcard.modeNumberOnlyDescription",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  labelKey: FlashcardI18nKey;
  descriptionKey: FlashcardI18nKey;
}>;

export type FlashcardMode = (typeof FLASHCARD_MODE_OPTIONS)[number]["value"];

export const isFlashcardMode = (value: string): value is FlashcardMode =>
  FLASHCARD_MODE_OPTIONS.some((opt) => opt.value === value);
