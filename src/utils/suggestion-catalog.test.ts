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
  timedModes: {
    flashcard: false,
    acaan: false,
    spotcheck: false,
    distance: false,
  },
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
  timedModes: { flashcard: true, acaan: true, spotcheck: true, distance: true },
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
  {
    id: "flashcard-timed",
    usage: {
      ...noUsage(),
      timedModes: { ...noUsage().timedModes, flashcard: true },
    },
  },
  {
    id: "spotcheck-timed",
    usage: {
      ...noUsage(),
      timedModes: { ...noUsage().timedModes, spotcheck: true },
    },
  },
  {
    id: "distance-timed",
    usage: {
      ...noUsage(),
      timedModes: { ...noUsage().timedModes, distance: true },
    },
  },
  {
    id: "acaan-timed",
    usage: {
      ...noUsage(),
      timedModes: { ...noUsage().timedModes, acaan: true },
    },
  },
];

describe("SUGGESTION_CATALOG", () => {
  it("contains 13 suggestions and TOTAL_SUGGESTIONS matches", () => {
    expect(SUGGESTION_CATALOG).toHaveLength(13);
    expect(TOTAL_SUGGESTIONS).toBe(13);
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

  it("attaches the expected deepLink per tier", () => {
    for (const suggestion of SUGGESTION_CATALOG) {
      if (suggestion.priority === 1) {
        // Whole modes just navigate — no preselect.
        expect(suggestion.deepLink).toBeUndefined();
      } else if (suggestion.priority === 2) {
        // Variants preselect their sub-mode via ?try=.
        expect(suggestion.deepLink?.param).toBe("try");
      } else {
        // Timed items (priority 3) carry the ?timed=1 preselect.
        expect(suggestion.deepLink).toEqual({ param: "timed", value: "1" });
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
      // Whole modes and variants stay applicable when everything's been tried;
      // timed items (priority 3) retire once the mode has a timed session, so
      // they are NOT applicable under allTrue.
      expect(suggestion.isApplicable(allTrue)).toBe(suggestion.priority !== 3);
      // With no usage, only whole modes (priority 1) are applicable.
      expect(suggestion.isApplicable(allFalse)).toBe(suggestion.priority === 1);
    }
  });

  it("gates each variant and timed item on its own parent mode and no other", () => {
    // One parent mode true at a time (timedModes stay false): only that mode's
    // variants AND its timed item become applicable — the timed item behaves
    // like a variant while the mode is still untimed. Catches an item gated on
    // the wrong parent (e.g. a spotcheck item requiring modes.flashcard).
    const parents: { mode: TrainingMode; gatedIds: string[] }[] = [
      {
        mode: "flashcard",
        gatedIds: [
          "flashcard-numberonly",
          "flashcard-neighbor",
          "flashcard-timed",
        ],
      },
      {
        mode: "spotcheck",
        gatedIds: ["spotcheck-swapped", "spotcheck-moved", "spotcheck-timed"],
      },
      {
        mode: "distance",
        gatedIds: ["distance-apply", "distance-signed", "distance-timed"],
      },
    ];
    for (const { mode, gatedIds } of parents) {
      const usage: UsageFlags = {
        ...noUsage(),
        modes: { ...noUsage().modes, [mode]: true },
      };
      for (const suggestion of SUGGESTION_CATALOG) {
        if (suggestion.priority === 1) {
          expect(suggestion.isApplicable(usage)).toBe(true);
        } else {
          expect(suggestion.isApplicable(usage)).toBe(
            gatedIds.includes(suggestion.id)
          );
        }
      }
    }
  });

  it("offers a timed item only for a mode tried untimed and not yet timed", () => {
    const timedItems = SUGGESTION_CATALOG.filter(
      (s) => s.deepLink?.param === "timed"
    );
    expect(timedItems).toHaveLength(4);

    for (const item of timedItems) {
      const triedUntimed: UsageFlags = {
        ...noUsage(),
        modes: { ...noUsage().modes, [item.mode]: true },
      };
      const triedTimed: UsageFlags = {
        ...triedUntimed,
        timedModes: { ...noUsage().timedModes, [item.mode]: true },
      };

      // Never opened the mode → the "try this mode" suggestion comes first.
      expect(item.isApplicable(noUsage())).toBe(false);
      // Drilled untimed → the timed nudge is applicable and not yet used.
      expect(item.isApplicable(triedUntimed)).toBe(true);
      expect(item.isUsed(triedUntimed)).toBe(false);
      // A real timed session retires it: used and no longer applicable.
      expect(item.isUsed(triedTimed)).toBe(true);
      expect(item.isApplicable(triedTimed)).toBe(false);
    }
  });
});
