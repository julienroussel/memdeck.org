import { DECK_SIZE } from "../constants";
import { isDistanceConvention, isDistanceMode } from "../types/distance";
import { isFlashcardMode } from "../types/flashcard";
import {
  type AllTimeStats,
  type SessionConfig,
  type SessionRecord,
  type StatsKey,
  TRAINING_MODES,
  type TrainingMode,
} from "../types/session";
import { isSpotCheckMode } from "../types/spot-check";
import { stacks } from "../types/stacks";
import { includes } from "./includes";

const VALID_STACK_KEYS: ReadonlySet<string> = new Set(Object.keys(stacks));

const isNonNegativeInteger = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isFraction = (v: unknown): v is number =>
  isFiniteNumber(v) && v >= 0 && v <= 1;

const isISODateString = (v: unknown): v is string => {
  if (typeof v !== "string") {
    return false;
  }
  const parsed = new Date(v);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === v;
};
const VALID_TRAINING_MODES: ReadonlySet<string> = new Set(TRAINING_MODES);

/** Validates that `value.stackLimits` is either absent/undefined or a valid {start, end} object.
 * Returns boolean (not a type guard) because the outer `isSessionRecord` handles full narrowing. */
const isOptionalStackLimits = (value: object): boolean => {
  if (!("stackLimits" in value) || value.stackLimits === undefined) {
    return true;
  }
  const sl = value.stackLimits;
  return (
    typeof sl === "object" &&
    sl !== null &&
    "start" in sl &&
    "end" in sl &&
    typeof sl.start === "number" &&
    typeof sl.end === "number" &&
    Number.isInteger(sl.start) &&
    Number.isInteger(sl.end) &&
    sl.start >= 1 &&
    sl.start <= DECK_SIZE &&
    sl.end >= 1 &&
    sl.end <= DECK_SIZE &&
    sl.start <= sl.end
  );
};

const isSessionConfig = (value: unknown): value is SessionConfig => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("type" in value)) {
    return false;
  }
  if (value.type === "open") {
    return true;
  }
  // totalQuestions is checked as `number` (not against SESSION_PRESETS) for
  // localStorage resilience — old data may contain presets that no longer exist.
  return (
    value.type === "structured" &&
    "totalQuestions" in value &&
    isNonNegativeInteger(value.totalQuestions) &&
    value.totalQuestions >= 1
  );
};

export const isSessionRecord = (value: unknown): value is SessionRecord => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (
    !(
      "id" in value &&
      "mode" in value &&
      "stackKey" in value &&
      "config" in value &&
      "startedAt" in value &&
      "endedAt" in value &&
      "durationSeconds" in value &&
      "successes" in value &&
      "fails" in value &&
      "questionsCompleted" in value &&
      "accuracy" in value &&
      "bestStreak" in value
    )
  ) {
    return false;
  }
  if (
    !(
      typeof value.id === "string" &&
      typeof value.mode === "string" &&
      includes(TRAINING_MODES, value.mode) &&
      typeof value.stackKey === "string" &&
      VALID_STACK_KEYS.has(value.stackKey) &&
      isSessionConfig(value.config) &&
      isISODateString(value.startedAt) &&
      isISODateString(value.endedAt) &&
      isFiniteNumber(value.durationSeconds) &&
      isNonNegativeInteger(value.successes) &&
      isNonNegativeInteger(value.fails) &&
      isNonNegativeInteger(value.questionsCompleted) &&
      isFraction(value.accuracy) &&
      isNonNegativeInteger(value.bestStreak)
    )
  ) {
    return false;
  }
  if (!isOptionalStackLimits(value)) {
    return false;
  }
  // System boundary: value has been validated structurally above (all required
  // keys present with correct primitive types); cast is needed because
  // `validatePerModeFields` indexes the per-mode optional fields generically
  // and TS can't widen `object` to a string-indexable record.
  return validatePerModeFields(value as Record<string, unknown>);
};

// Per-mode optional-field validation extracted to keep `isSessionRecord` under
// the cognitive-complexity ceiling. `value` has already been narrowed to an
// object with a valid TrainingMode string at `mode` (verified by the
// `includes(TRAINING_MODES, value.mode)` check at the call site). Typed as
// `Record<string, unknown>` so per-field lookups don't require a cast inside
// `isOptionalEnumField`.
// Foreign-mode field names per discriminator. A record's value at any of
// these keys must be undefined for that variant — extra mode-specific fields
// from other modes are a sign of corrupt persisted state, not just type-
// system slack from structural typing.
const FOREIGN_MODE_FIELDS = {
  flashcard: ["spotCheckMode", "distanceMode", "distanceConvention"],
  acaan: [
    "flashcardMode",
    "spotCheckMode",
    "distanceMode",
    "distanceConvention",
  ],
  spotcheck: ["flashcardMode", "distanceMode", "distanceConvention"],
  distance: ["flashcardMode", "spotCheckMode"],
} as const satisfies Record<TrainingMode, readonly string[]>;

// A foreign-mode field is treated as "absent" only when the key is missing
// entirely OR explicitly `undefined`. An explicit `null` (or any other value)
// is corrupt — a record carrying `"flashcardMode": null` on an acaan session
// would otherwise pass this guard and reach reducers that don't expect it.
const hasOwn = (obj: object, key: string): boolean => {
  // biome-ignore lint/suspicious/noPrototypeBuiltins: project tsconfig targets ES2020 lib; Object.hasOwn requires ES2022.
  return Object.prototype.hasOwnProperty.call(obj, key);
};

const hasNoForeignModeFields = (
  value: Record<string, unknown>,
  mode: keyof typeof FOREIGN_MODE_FIELDS
): boolean =>
  FOREIGN_MODE_FIELDS[mode].every(
    (key) => !hasOwn(value, key) || value[key] === undefined
  );

const validatePerModeFields = (value: Record<string, unknown>): boolean => {
  switch (value.mode) {
    case "flashcard":
      return (
        isOptionalEnumField(value, "flashcardMode", isFlashcardMode) &&
        hasNoForeignModeFields(value, "flashcard")
      );
    case "acaan":
      return hasNoForeignModeFields(value, "acaan");
    case "spotcheck":
      return (
        isOptionalEnumField(value, "spotCheckMode", isSpotCheckMode) &&
        hasNoForeignModeFields(value, "spotcheck")
      );
    case "distance":
      return (
        isOptionalEnumField(value, "distanceMode", isDistanceMode) &&
        isOptionalEnumField(
          value,
          "distanceConvention",
          isDistanceConvention
        ) &&
        hasNoForeignModeFields(value, "distance")
      );
    default:
      return false;
  }
};

// Helper: a field is valid if absent, undefined, or passes the type guard.
// Takes `Record<string, unknown>` so the `value[field]` lookup is type-safe
// without a cast at the access site.
const isOptionalEnumField = <T>(
  value: Record<string, unknown>,
  field: string,
  guard: (v: unknown) => v is T
): boolean => {
  const fieldValue = value[field];
  return fieldValue === undefined || guard(fieldValue);
};

export const isSessionRecordArray = (
  value: unknown
): value is SessionRecord[] =>
  Array.isArray(value) && value.every(isSessionRecord);

/** Validates that a string matches the `{TrainingMode}:{StackKey}` format */
export const isStatsKey = (key: string): key is StatsKey => {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex === -1) {
    return false;
  }
  const mode = key.slice(0, separatorIndex);
  const stack = key.slice(separatorIndex + 1);
  return VALID_TRAINING_MODES.has(mode) && VALID_STACK_KEYS.has(stack);
};

export const isAllTimeStats = (value: unknown): value is AllTimeStats => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  // System boundary: value is validated structurally below; cast is needed because
  // Object.entries() requires Record<string, unknown> but value is typed as object.
  const record = value as Record<string, unknown>;
  return Object.entries(record).every(([key, entry]) => {
    if (!isStatsKey(key)) {
      return false;
    }
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    if (
      !(
        "totalSessions" in entry &&
        "totalQuestions" in entry &&
        "totalSuccesses" in entry &&
        "totalFails" in entry &&
        "globalBestStreak" in entry
      )
    ) {
      return false;
    }
    return (
      isNonNegativeInteger(entry.totalSessions) &&
      isNonNegativeInteger(entry.totalQuestions) &&
      isNonNegativeInteger(entry.totalSuccesses) &&
      isNonNegativeInteger(entry.totalFails) &&
      isNonNegativeInteger(entry.globalBestStreak)
    );
  });
};
