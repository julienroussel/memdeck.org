import type en from "../i18n/locales/en.json";

/** Valid i18n keys for spot-check-related translations, derived from en.json */
export type SpotCheckI18nKey =
  `spotCheck.${keyof (typeof en)["spotCheck"] & string}`;

export const SPOT_CHECK_MODE_OPTIONS = [
  {
    value: "missing",
    labelKey: "spotCheck.modeMissing",
    descriptionKey: "spotCheck.modeMissingDescription",
  },
  {
    value: "swapped",
    labelKey: "spotCheck.modeSwapped",
    descriptionKey: "spotCheck.modeSwappedDescription",
  },
  {
    value: "moved",
    labelKey: "spotCheck.modeMoved",
    descriptionKey: "spotCheck.modeMovedDescription",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  labelKey: SpotCheckI18nKey;
  descriptionKey: SpotCheckI18nKey;
}>;

export type SpotCheckMode = (typeof SPOT_CHECK_MODE_OPTIONS)[number]["value"];

export const isSpotCheckMode = (value: unknown): value is SpotCheckMode =>
  typeof value === "string" &&
  SPOT_CHECK_MODE_OPTIONS.some((opt) => opt.value === value);
