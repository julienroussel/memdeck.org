import type { UsageFlags } from "../types/discovery";
import type { DistanceConvention, DistanceMode } from "../types/distance";
import type { FlashcardMode } from "../types/flashcard";
import {
  type SessionRecord,
  TRAINING_MODES,
  type TrainingMode,
} from "../types/session";
import type { SpotCheckMode } from "../types/spot-check";

/**
 * Derive which training modes and sub-variants a user has tried from their
 * completed-session history. Pure; scans the history once. Optional per-mode
 * fields are guarded against `undefined` on old records (pre-#694 and any
 * record persisted before a sub-variant existed). `timedModes` flags a mode
 * once it has a session with `timed === true`; `undefined`/`false` count as
 * not-timed, so pre-#694 records never falsely mark a mode timed (#697).
 */
export const deriveFeatureUsage = (history: SessionRecord[]): UsageFlags => {
  // Explicit `Record<…>` annotations (not `satisfies`) so the fields widen to
  // `boolean`/`number` for later mutation while still requiring every union
  // member as a key — a new mode/variant is a compile error here.
  const modes: Record<TrainingMode, boolean> = {
    acaan: false,
    distance: false,
    flashcard: false,
    spotcheck: false,
  };
  const flashcardModes: Record<FlashcardMode, boolean> = {
    bothmodes: false,
    cardonly: false,
    neighbor: false,
    numberonly: false,
  };
  const spotCheckModes: Record<SpotCheckMode, boolean> = {
    missing: false,
    moved: false,
    swapped: false,
  };
  const distanceModes: Record<DistanceMode, boolean> = {
    apply: false,
    both: false,
    compute: false,
  };
  const distanceConventions: Record<DistanceConvention, boolean> = {
    cyclic: false,
    signed: false,
  };
  const timedModes: Record<TrainingMode, boolean> = {
    acaan: false,
    distance: false,
    flashcard: false,
    spotcheck: false,
  };
  const counts: Record<TrainingMode, number> = {
    acaan: 0,
    distance: 0,
    flashcard: 0,
    spotcheck: 0,
  };

  for (const record of history) {
    modes[record.mode] = true;
    if (record.timed === true) {
      timedModes[record.mode] = true;
    }
    counts[record.mode] += 1;
    switch (record.mode) {
      case "flashcard":
        if (record.flashcardMode) {
          flashcardModes[record.flashcardMode] = true;
        }
        break;
      case "spotcheck":
        if (record.spotCheckMode) {
          spotCheckModes[record.spotCheckMode] = true;
        }
        break;
      case "distance":
        if (record.distanceMode) {
          distanceModes[record.distanceMode] = true;
        }
        if (record.distanceConvention) {
          distanceConventions[record.distanceConvention] = true;
        }
        break;
      default:
        // acaan has no sub-variants.
        break;
    }
  }

  // Most-used mode by session count; iterating TRAINING_MODES with a strict `>`
  // keeps the earlier-declared mode on ties, so the result is deterministic.
  let mostUsedMode: TrainingMode | null = null;
  let maxCount = 0;
  for (const mode of TRAINING_MODES) {
    if (counts[mode] > maxCount) {
      maxCount = counts[mode];
      mostUsedMode = mode;
    }
  }

  return {
    distanceConventions,
    distanceModes,
    flashcardModes,
    modes,
    mostUsedMode,
    spotCheckModes,
    timedModes,
  };
};
