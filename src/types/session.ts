import type en from "../i18n/locales/en.json";
import type { StackKey } from "./stacks";

/** Training mode identifier (extensible for future modes) */
export const TRAINING_MODES = ["flashcard", "acaan"] as const;
export type TrainingMode = (typeof TRAINING_MODES)[number];

/** Session presets for structured sessions */
export const SESSION_PRESETS = [10, 20, 30, 52] as const;
export type SessionPreset = (typeof SESSION_PRESETS)[number];

/** Discriminated union for session config */
export type SessionConfig =
  | { type: "structured"; totalQuestions: SessionPreset }
  | { type: "open" };

/** Runtime state of an active session */
export type ActiveSession = {
  id: string;
  mode: TrainingMode;
  stackKey: StackKey;
  config: SessionConfig;
  startedAt: string;
  successes: number;
  fails: number;
  questionsCompleted: number;
  currentStreak: number;
  bestStreak: number;
};

/** Persisted session record (immutable snapshot) */
export type SessionRecord = {
  id: string;
  mode: TrainingMode;
  stackKey: StackKey;
  config: SessionConfig;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  successes: number;
  fails: number;
  questionsCompleted: number;
  accuracy: number;
  bestStreak: number;
};

/** Aggregated all-time stats entry */
export type AllTimeStatsEntry = {
  totalSessions: number;
  totalQuestions: number;
  totalSuccesses: number;
  totalFails: number;
  globalBestStreak: number;
};

/** Composite key for AllTimeStats: "{mode}:{stackKey}" (e.g. "flashcard:mnemonica") */
export type StatsKey = `${TrainingMode}:${StackKey}`;

/** Keyed by StatsKey — not all combinations will have entries */
export type AllTimeStats = Partial<Record<StatsKey, AllTimeStatsEntry>>;

/** Valid i18n keys for session encouragement messages, derived from en.json */
type EncouragementMessages = (typeof en)["session"]["encouragement"];
export type EncouragementKey =
  `session.encouragement.${keyof EncouragementMessages & string}`;

/** Translation key with optional interpolation params for encouragement messages */
export type Encouragement = {
  key: EncouragementKey;
  params?: Record<string, number>;
};

/** Session summary for the end-of-session screen */
export type SessionSummary = {
  record: SessionRecord;
  encouragement: Encouragement;
  isAccuracyImprovement: boolean;
  isNewGlobalBestStreak: boolean;
  previousAverageAccuracy: number | null;
};

/** Answer outcome communicated from game hooks to session system */
export type AnswerOutcome = {
  correct: boolean;
  questionAdvanced: boolean;
};

/** Discriminated union representing the current phase of a training session */
export type SessionPhase =
  | { phase: "idle" }
  | { phase: "active"; session: ActiveSession }
  | { phase: "summary"; summary: SessionSummary };
