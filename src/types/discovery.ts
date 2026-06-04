import type { Icon } from "@tabler/icons-react";
import type { ParseKeys } from "i18next";
import type { RoutePath } from "../constants";
import type { DistanceConvention, DistanceMode } from "./distance";
import type { FlashcardMode } from "./flashcard";
import type { TrainingMode } from "./session";
import type { SpotCheckMode } from "./spot-check";

/** Where a discovery suggestion is surfaced. */
export type DiscoverySurface = "home" | "summary" | "stats";

/**
 * Which training modes and sub-variants a user has already tried, derived from
 * their session history. One boolean per mode and per sub-variant, plus the
 * most-used mode for personalizing suggestion priority.
 */
export type UsageFlags = {
  modes: Record<TrainingMode, boolean>;
  flashcardModes: Record<FlashcardMode, boolean>;
  spotCheckModes: Record<SpotCheckMode, boolean>;
  distanceModes: Record<DistanceMode, boolean>;
  distanceConventions: Record<DistanceConvention, boolean>;
  /** Most-used mode by completed-session count, or null when there is no history. */
  mostUsedMode: TrainingMode | null;
};

/**
 * A single discoverable feature — either a whole training mode or a sub-variant
 * of one. `isUsed`/`isApplicable` are pure predicates over {@link UsageFlags}.
 */
export type FeatureSuggestion = {
  id: string;
  mode: TrainingMode;
  /** True once the user has tried this exact mode/variant — drops the suggestion. */
  isUsed: (usage: UsageFlags) => boolean;
  /** Whole modes are always applicable; variants require the parent mode tried. */
  isApplicable: (usage: UsageFlags) => boolean;
  /** Lower sorts first. Whole modes outrank variants. */
  priority: number;
  route: RoutePath;
  /** Preselect param the page will honor from #696; until then it lands in the default mode. */
  deepLink?: { param: "try" | "timed"; value: string };
  icon: Icon;
  i18n: { titleKey: ParseKeys; ctaKey?: ParseKeys };
};

/** Persisted discovery state: retired/dismissed ids + a session-count snooze gate. */
export type FeatureDiscoveryState = {
  dismissed: string[];
  snoozedUntil: number;
};
