import { DECK_SIZE } from "../constants";
import { isFlashcardMode } from "../types/flashcard";
import {
  type AllTimeStats,
  type SessionConfig,
  type SessionRecord,
  type StatsKey,
  TRAINING_MODES,
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

const isISODateString = (v: unknown): v is string =>
  typeof v === "string" && !Number.isNaN(Date.parse(v));
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
  // For flashcard mode, validate flashcardMode if present
  if (value.mode === "flashcard") {
    if (
      "flashcardMode" in value &&
      value.flashcardMode !== undefined &&
      !isFlashcardMode(value.flashcardMode)
    ) {
      return false;
    }
    return true;
  }
  // For acaan mode, flashcardMode should not be present
  if (value.mode === "acaan") {
    if ("flashcardMode" in value && value.flashcardMode !== undefined) {
      return false;
    }
    return true;
  }
  // For spotcheck mode, validate spotCheckMode if present
  if (value.mode === "spotcheck") {
    if (
      "spotCheckMode" in value &&
      value.spotCheckMode !== undefined &&
      !isSpotCheckMode(value.spotCheckMode)
    ) {
      return false;
    }
    return true;
  }
  return false;
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
