import type en from "../../i18n/locales/en.json";
import type { TrainingMode } from "../../types/session";

/** Valid i18n keys for stats translations, derived from en.json */
export type StatsI18nKey = `stats.${keyof (typeof en)["stats"] & string}`;

export const MODE_LABELS = {
  acaan: "stats.modeAcaan",
  distance: "stats.modeDistance",
  flashcard: "stats.modeFlashcard",
  spotcheck: "stats.modeSpotCheck",
} as const satisfies Record<TrainingMode, StatsI18nKey>;
