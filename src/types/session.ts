import type en from "../i18n/locales/en.json";
import type { FlashcardMode } from "./flashcard";
import type { SpotCheckMode } from "./spot-check";
import type { StackLimits } from "./stack-limits";
import type { StackKey } from "./stacks";

/** Training mode identifier (extensible for future modes) */
export const TRAINING_MODES = ["flashcard", "acaan", "spotcheck"] as const;
export type TrainingMode = (typeof TRAINING_MODES)[number];

/** Session presets for structured sessions */
export const SESSION_PRESETS = [10, 20, 30, 52] as const;

/** Discriminated union for session config */
export type SessionConfig =
  | { type: "structured"; totalQuestions: number }
  | { type: "open" };

/** Shared fields for an active session */
export type ActiveSessionBase = {
  id: string;
  stackKey: StackKey;
  config: SessionConfig;
  startedAt: string;
  successes: number;
  fails: number;
  questionsCompleted: number;
  currentStreak: number;
  bestStreak: number;
  stackLimits?: StackLimits;
};

/** Runtime state of an active session */
export type ActiveSession =
  | (ActiveSessionBase & { mode: "flashcard"; flashcardMode: FlashcardMode })
  | (ActiveSessionBase & { mode: "acaan" })
  | (ActiveSessionBase & { mode: "spotcheck"; spotCheckMode: SpotCheckMode });

/** Shared fields for a persisted session record */
type SessionRecordBase = {
  id: string;
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
  // Intentional brand erasure: DeckPosition doesn't survive JSON.stringify/JSON.parse,
  // so the persisted type uses plain numbers instead of the branded StackLimits type.
  stackLimits?: { start: number; end: number };
};

/** Persisted session record (immutable snapshot) */
export type SessionRecord =
  | (SessionRecordBase & { mode: "flashcard"; flashcardMode?: FlashcardMode })
  | (SessionRecordBase & { mode: "acaan" })
  | (SessionRecordBase & {
      mode: "spotcheck";
      spotCheckMode?: SpotCheckMode;
    });

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
