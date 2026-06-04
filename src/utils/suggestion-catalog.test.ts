import { describe, expect, it } from "vitest";
import { ROUTES } from "../constants";
import type { UsageFlags } from "../types/discovery";
import type { TrainingMode } from "../types/session";
import { SUGGESTION_CATALOG, TOTAL_SUGGESTIONS } from "./suggestion-catalog";

/** A fresh all-false usage object, so each case can flip exactly one flag. */
const noUsage = (): UsageFlags => ({
  modes: { flashcard: false, acaan: false, spotcheck: false, distance: false },
  flashcardModes: {
    cardonly: false,
    bothmodes: false,
    numberonly: false,
    neighbor: false,
  },
  spotCheckModes: { missing: false, swapped: false, moved: false },
  distanceModes: { compute: false, apply: false, both: false },
  distanceConventions: { cyclic: false, signed: false },
  mostUsedMode: null,
});

const allFalse: UsageFlags = noUsage();

const allTrue: UsageFlags = {
  modes: { flashcard: true, acaan: true, spotcheck: true, distance: true },
  flashcardModes: {
    cardonly: true,
    bothmodes: true,
    numberonly: true,
    neighbor: true,
  },
  spotCheckModes: { missing: true, swapped: true, moved: true },
  distanceModes: { compute: true, apply: true, both: true },
  distanceConventions: { cyclic: true, signed: true },
  mostUsedMode: "flashcard",
};

/**
 * One usage object per suggestion, each setting only the single flag that
 * should mark THAT suggestion as used. Drives the discrimination test that
 * catches a predicate wired to the wrong flag.
 */
const singleUsedCases: { id: string; usage: UsageFlags }[] = [
  {
    id: "mode-spotcheck",
    usage: { ...noUsage(), modes: { ...noUsage().modes, spotcheck: true } },
  },
  {
    id: "mode-distance",
    usage: { ...noUsage(), modes: { ...noUsage().modes, distance: true } },
  },
  {
    id: "mode-acaan",
    usage: { ...noUsage(), modes: { ...noUsage().modes, acaan: true } },
  },
  {
    id: "flashcard-numberonly",
    usage: {
      ...noUsage(),
      flashcardModes: { ...noUsage().flashcardModes, numberonly: true },
    },
  },
  {
    id: "flashcard-neighbor",
    usage: {
      ...noUsage(),
      flashcardModes: { ...noUsage().flashcardModes, neighbor: true },
    },
  },
  {
    id: "spotcheck-swapped",
    usage: {
      ...noUsage(),
      spotCheckModes: { ...noUsage().spotCheckModes, swapped: true },
    },
  },
  {
    id: "spotcheck-moved",
    usage: {
      ...noUsage(),
      spotCheckModes: { ...noUsage().spotCheckModes, moved: true },
    },
  },
  {
    id: "distance-apply",
    usage: {
      ...noUsage(),
      distanceModes: { ...noUsage().distanceModes, apply: true },
    },
  },
  {
    id: "distance-signed",
    usage: {
      ...noUsage(),
      distanceConventions: { ...noUsage().distanceConventions, signed: true },
    },
  },
];

describe("SUGGESTION_CATALOG", () => {
  it("contains 9 suggestions and TOTAL_SUGGESTIONS matches", () => {
    expect(SUGGESTION_CATALOG).toHaveLength(9);
    expect(TOTAL_SUGGESTIONS).toBe(9);
  });

  it("has unique ids", () => {
    const ids = SUGGESTION_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("routes every suggestion to a known ROUTES path", () => {
    const knownRoutes = new Set<string>(Object.values(ROUTES));
    for (const suggestion of SUGGESTION_CATALOG) {
      expect(knownRoutes.has(suggestion.route)).toBe(true);
    }
  });

  it("attaches a deepLink to variants and none to whole modes", () => {
    for (const suggestion of SUGGESTION_CATALOG) {
      if (suggestion.priority === 1) {
        expect(suggestion.deepLink).toBeUndefined();
      } else {
        expect(suggestion.deepLink?.param).toBe("try");
      }
    }
  });

  it("marks every suggestion used when all usage flags are set", () => {
    for (const suggestion of SUGGESTION_CATALOG) {
      expect(suggestion.isUsed(allTrue)).toBe(true);
    }
  });

  it("marks no suggestion used when no usage flags are set", () => {
    for (const suggestion of SUGGESTION_CATALOG) {
      expect(suggestion.isUsed(allFalse)).toBe(false);
    }
  });

  it("each suggestion's isUsed reads its own flag and no other", () => {
    // Setting exactly one flag must mark ONLY the matching suggestion used. A
    // predicate wired to the wrong flag (e.g. numberonly reading neighbor)
    // would fail here — the all-true/all-false tests above cannot catch it.
    for (const { id, usage } of singleUsedCases) {
      for (const suggestion of SUGGESTION_CATALOG) {
        expect(suggestion.isUsed(usage)).toBe(suggestion.id === id);
      }
    }
  });

  it("treats whole modes as always applicable and variants as parent-gated", () => {
    for (const suggestion of SUGGESTION_CATALOG) {
      expect(suggestion.isApplicable(allTrue)).toBe(true);
      // With no usage, only whole modes (priority 1) are applicable.
      expect(suggestion.isApplicable(allFalse)).toBe(suggestion.priority === 1);
    }
  });

  it("gates each variant on its own parent mode and no other", () => {
    // One parent mode true at a time: only that mode's variants become
    // applicable. Catches a variant gated on the wrong parent (e.g. a
    // spotcheck variant requiring modes.flashcard).
    const parents: { mode: TrainingMode; variantIds: string[] }[] = [
      {
        mode: "flashcard",
        variantIds: ["flashcard-numberonly", "flashcard-neighbor"],
      },
      {
        mode: "spotcheck",
        variantIds: ["spotcheck-swapped", "spotcheck-moved"],
      },
      { mode: "distance", variantIds: ["distance-apply", "distance-signed"] },
    ];
    for (const { mode, variantIds } of parents) {
      const usage: UsageFlags = {
        ...noUsage(),
        modes: { ...noUsage().modes, [mode]: true },
      };
      for (const suggestion of SUGGESTION_CATALOG) {
        if (suggestion.priority === 1) {
          expect(suggestion.isApplicable(usage)).toBe(true);
        } else {
          expect(suggestion.isApplicable(usage)).toBe(
            variantIds.includes(suggestion.id)
          );
        }
      }
    }
  });
});
