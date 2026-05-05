import type en from "../i18n/locales/en.json";

/** Valid i18n keys for distance-related translations, derived from en.json */
type DistanceI18nKey = `distance.${keyof (typeof en)["distance"] & string}`;

const DISTANCE_MODE_OPTIONS = [
  {
    value: "compute",
    labelKey: "distance.modeCompute",
    descriptionKey: "distance.modeComputeDescription",
  },
  {
    value: "apply",
    labelKey: "distance.modeApply",
    descriptionKey: "distance.modeApplyDescription",
  },
  {
    value: "both",
    labelKey: "distance.modeBoth",
    descriptionKey: "distance.modeBothDescription",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  labelKey: DistanceI18nKey;
  descriptionKey: DistanceI18nKey;
}>;

export type DistanceMode = (typeof DISTANCE_MODE_OPTIONS)[number]["value"];

export const isDistanceMode = (value: unknown): value is DistanceMode =>
  typeof value === "string" &&
  DISTANCE_MODE_OPTIONS.some((opt) => opt.value === value);

export { DISTANCE_MODE_OPTIONS };

const DISTANCE_CONVENTION_OPTIONS = [
  {
    value: "cyclic",
    labelKey: "distance.conventionCyclic",
    descriptionKey: "distance.conventionCyclicDescription",
  },
  {
    value: "signed",
    labelKey: "distance.conventionSigned",
    descriptionKey: "distance.conventionSignedDescription",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  labelKey: DistanceI18nKey;
  descriptionKey: DistanceI18nKey;
}>;

export type DistanceConvention =
  (typeof DISTANCE_CONVENTION_OPTIONS)[number]["value"];

export const isDistanceConvention = (
  value: unknown
): value is DistanceConvention =>
  typeof value === "string" &&
  DISTANCE_CONVENTION_OPTIONS.some((opt) => opt.value === value);

export { DISTANCE_CONVENTION_OPTIONS };

/** Which kind of round is currently rendered: two cards → distance, or card + offset → card. */
export type DistancePromptKind = Exclude<DistanceMode, "both">;
