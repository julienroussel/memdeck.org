import { describe, expect, it } from "vitest";
import type { DistanceConvention, DistanceMode } from "../types/distance";
import type { FlashcardMode } from "../types/flashcard";
import type { SessionRecord } from "../types/session";
import type { SpotCheckMode } from "../types/spot-check";
import { deriveFeatureUsage } from "./feature-usage";

/** Shared base fields for a persisted record, minus the mode discriminator. */
type BaseFields = Omit<Extract<SessionRecord, { mode: "acaan" }>, "mode">;

const base = (id: string): BaseFields => ({
  id,
  stackKey: "mnemonica",
  config: { type: "open" },
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T00:05:00.000Z",
  durationSeconds: 300,
  successes: 8,
  fails: 2,
  questionsCompleted: 10,
  accuracy: 0.8,
  bestStreak: 5,
});

const flashcard = (
  id: string,
  flashcardMode?: FlashcardMode
): SessionRecord => ({
  ...base(id),
  mode: "flashcard",
  flashcardMode,
});

const spotcheck = (
  id: string,
  spotCheckMode?: SpotCheckMode
): SessionRecord => ({
  ...base(id),
  mode: "spotcheck",
  spotCheckMode,
});

const distance = (
  id: string,
  distanceMode?: DistanceMode,
  distanceConvention?: DistanceConvention
): SessionRecord => ({
  ...base(id),
  mode: "distance",
  distanceMode,
  distanceConvention,
});

const acaan = (id: string): SessionRecord => ({ ...base(id), mode: "acaan" });

describe("deriveFeatureUsage", () => {
  it("returns all-false flags and null mostUsedMode for empty history", () => {
    const usage = deriveFeatureUsage([]);

    expect(usage.modes).toEqual({
      flashcard: false,
      acaan: false,
      spotcheck: false,
      distance: false,
    });
    expect(Object.values(usage.flashcardModes).every((v) => v === false)).toBe(
      true
    );
    expect(Object.values(usage.spotCheckModes).every((v) => v === false)).toBe(
      true
    );
    expect(Object.values(usage.distanceModes).every((v) => v === false)).toBe(
      true
    );
    expect(
      Object.values(usage.distanceConventions).every((v) => v === false)
    ).toBe(true);
    expect(usage.mostUsedMode).toBeNull();
  });

  it("flags the tried mode and sub-variant for a single flashcard session", () => {
    const usage = deriveFeatureUsage([flashcard("1", "numberonly")]);

    expect(usage.modes.flashcard).toBe(true);
    expect(usage.modes.spotcheck).toBe(false);
    expect(usage.flashcardModes.numberonly).toBe(true);
    expect(usage.flashcardModes.cardonly).toBe(false);
    expect(usage.mostUsedMode).toBe("flashcard");
  });

  it("flags every mode and sub-variant when all are present", () => {
    const usage = deriveFeatureUsage([
      flashcard("1", "cardonly"),
      flashcard("2", "bothmodes"),
      flashcard("3", "numberonly"),
      flashcard("4", "neighbor"),
      spotcheck("5", "missing"),
      spotcheck("6", "swapped"),
      spotcheck("7", "moved"),
      distance("8", "compute", "cyclic"),
      distance("9", "apply", "signed"),
      distance("10", "both", "cyclic"),
      acaan("11"),
    ]);

    expect(usage.modes).toEqual({
      flashcard: true,
      acaan: true,
      spotcheck: true,
      distance: true,
    });
    expect(usage.flashcardModes).toEqual({
      cardonly: true,
      bothmodes: true,
      numberonly: true,
      neighbor: true,
    });
    expect(usage.spotCheckModes).toEqual({
      missing: true,
      swapped: true,
      moved: true,
    });
    expect(usage.distanceModes).toEqual({
      compute: true,
      apply: true,
      both: true,
    });
    expect(usage.distanceConventions).toEqual({ cyclic: true, signed: true });
  });

  it("leaves sub-variant flags false for records missing the optional field", () => {
    const usage = deriveFeatureUsage([
      flashcard("1"),
      spotcheck("2"),
      distance("3"),
    ]);

    expect(usage.modes.flashcard).toBe(true);
    expect(usage.modes.spotcheck).toBe(true);
    expect(usage.modes.distance).toBe(true);
    expect(Object.values(usage.flashcardModes).every((v) => v === false)).toBe(
      true
    );
    expect(Object.values(usage.spotCheckModes).every((v) => v === false)).toBe(
      true
    );
    expect(Object.values(usage.distanceModes).every((v) => v === false)).toBe(
      true
    );
    expect(
      Object.values(usage.distanceConventions).every((v) => v === false)
    ).toBe(true);
  });

  it("picks the most-used mode by session count", () => {
    const usage = deriveFeatureUsage([
      flashcard("1"),
      distance("2"),
      distance("3"),
      distance("4"),
    ]);

    expect(usage.mostUsedMode).toBe("distance");
  });

  it("breaks most-used-mode ties by TRAINING_MODES order", () => {
    // Two flashcard and two spotcheck sessions tie; flashcard is declared first.
    const usage = deriveFeatureUsage([
      spotcheck("1"),
      spotcheck("2"),
      flashcard("3"),
      flashcard("4"),
    ]);

    expect(usage.mostUsedMode).toBe("flashcard");
  });
});
