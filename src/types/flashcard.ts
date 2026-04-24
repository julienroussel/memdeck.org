import type en from "../i18n/locales/en.json";

/** Valid i18n keys for flashcard-related translations, derived from en.json */
type FlashcardI18nKey = `flashcard.${keyof (typeof en)["flashcard"] & string}`;

const FLASHCARD_MODE_OPTIONS = [
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
  {
    value: "neighbor",
    labelKey: "flashcard.modeNeighbor",
    descriptionKey: "flashcard.modeNeighborDescription",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  labelKey: FlashcardI18nKey;
  descriptionKey: FlashcardI18nKey;
}>;

export type FlashcardMode = (typeof FLASHCARD_MODE_OPTIONS)[number]["value"];

export const isFlashcardMode = (value: unknown): value is FlashcardMode =>
  typeof value === "string" &&
  FLASHCARD_MODE_OPTIONS.some((opt) => opt.value === value);

export type NeighborDirection = "before" | "after" | "random";

export const NEIGHBOR_DIRECTION_OPTIONS = [
  { value: "before", labelKey: "flashcard.neighborBefore" },
  { value: "after", labelKey: "flashcard.neighborAfter" },
  { value: "random", labelKey: "flashcard.neighborRandom" },
] as const satisfies ReadonlyArray<{
  value: NeighborDirection;
  labelKey: FlashcardI18nKey;
}>;

export const isNeighborDirection = (
  value: unknown
): value is NeighborDirection =>
  value === "before" || value === "after" || value === "random";

// --- Two-tier UI model ---

type PrimaryMode = "position" | "neighbor";

type PositionSubMode = "cardonly" | "numberonly" | "bothmodes";

export const PRIMARY_MODE_OPTIONS = [
  { value: "position", labelKey: "flashcard.modePosition" },
  { value: "neighbor", labelKey: "flashcard.modeNeighbor" },
] as const satisfies ReadonlyArray<{
  value: PrimaryMode;
  labelKey: FlashcardI18nKey;
}>;

export const POSITION_SUB_MODE_OPTIONS = [
  { value: "cardonly", labelKey: "flashcard.subModeCard" },
  { value: "numberonly", labelKey: "flashcard.subModeNumber" },
  { value: "bothmodes", labelKey: "flashcard.subModeBoth" },
] as const satisfies ReadonlyArray<{
  value: PositionSubMode;
  labelKey: FlashcardI18nKey;
}>;

export const isPrimaryMode = (value: unknown): value is PrimaryMode =>
  value === "position" || value === "neighbor";

export const isPositionSubMode = (value: unknown): value is PositionSubMode =>
  value === "cardonly" || value === "numberonly" || value === "bothmodes";

export const toPrimaryMode = (mode: FlashcardMode): PrimaryMode =>
  mode === "neighbor" ? "neighbor" : "position";

export const toPositionSubMode = (mode: FlashcardMode): PositionSubMode =>
  mode === "neighbor" ? "bothmodes" : mode;

export const toFlashcardMode = (
  primary: PrimaryMode,
  subMode: PositionSubMode
): FlashcardMode => (primary === "neighbor" ? "neighbor" : subMode);
