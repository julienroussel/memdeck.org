import i18n from "i18next";
import { describe, expect, it } from "vitest";
import { DEFAULT_STACK_LIMITS } from "../../types/stack-limits";
import { createDeckPosition } from "../../types/stacks";
import { getFlashcardSubtitle } from "./flashcard-subtitle";

describe("getFlashcardSubtitle", () => {
  it("names only the mode on the stack range", () => {
    expect(
      getFlashcardSubtitle(i18n.t, "cardonly", {
        kind: "range",
        limits: DEFAULT_STACK_LIMITS,
      })
    ).toBe("Position mode");
  });

  it("adds the focus list's size while one is set", () => {
    expect(
      getFlashcardSubtitle(i18n.t, "neighbor", {
        kind: "focus",
        positions: [1, 2, 3, 4, 5].map(createDeckPosition),
      })
    ).toBe("Neighbor mode · Focus: 5 positions");
  });
});
