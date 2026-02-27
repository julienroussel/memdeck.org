import {
  type AllTimeStats,
  type SessionConfig,
  type SessionRecord,
  type StatsKey,
  TRAINING_MODES,
} from "../types/session";
import { stacks } from "../types/stacks";
import { includes } from "./includes";

const VALID_STACK_KEYS: ReadonlySet<string> = new Set(Object.keys(stacks));
const VALID_TRAINING_MODES: ReadonlySet<string> = new Set(TRAINING_MODES);

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
    typeof value.totalQuestions === "number"
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
  return (
    typeof value.id === "string" &&
    typeof value.mode === "string" &&
    includes(TRAINING_MODES, value.mode) &&
    typeof value.stackKey === "string" &&
    isSessionConfig(value.config) &&
    typeof value.startedAt === "string" &&
    typeof value.endedAt === "string" &&
    typeof value.durationSeconds === "number" &&
    typeof value.successes === "number" &&
    typeof value.fails === "number" &&
    typeof value.questionsCompleted === "number" &&
    typeof value.accuracy === "number" &&
    typeof value.bestStreak === "number"
  );
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
      typeof entry.totalSessions === "number" &&
      typeof entry.totalQuestions === "number" &&
      typeof entry.totalSuccesses === "number" &&
      typeof entry.totalFails === "number" &&
      typeof entry.globalBestStreak === "number"
    );
  });
};
