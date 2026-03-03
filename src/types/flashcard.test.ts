import { describe, expect, it } from "vitest";
import {
  isFlashcardMode,
  isNeighborDirection,
  isPositionSubMode,
  isPrimaryMode,
  toFlashcardMode,
  toPositionSubMode,
  toPrimaryMode,
} from "./flashcard";

describe("toPrimaryMode", () => {
  it("returns 'position' for cardonly mode", () => {
    expect(toPrimaryMode("cardonly")).toBe("position");
  });

  it("returns 'position' for numberonly mode", () => {
    expect(toPrimaryMode("numberonly")).toBe("position");
  });

  it("returns 'position' for bothmodes mode", () => {
    expect(toPrimaryMode("bothmodes")).toBe("position");
  });

  it("returns 'neighbor' for neighbor mode", () => {
    expect(toPrimaryMode("neighbor")).toBe("neighbor");
  });
});

describe("toPositionSubMode", () => {
  it("returns the mode itself for cardonly", () => {
    expect(toPositionSubMode("cardonly")).toBe("cardonly");
  });

  it("returns the mode itself for numberonly", () => {
    expect(toPositionSubMode("numberonly")).toBe("numberonly");
  });

  it("returns the mode itself for bothmodes", () => {
    expect(toPositionSubMode("bothmodes")).toBe("bothmodes");
  });

  it("returns 'bothmodes' as fallback for neighbor mode", () => {
    expect(toPositionSubMode("neighbor")).toBe("bothmodes");
  });
});

describe("toFlashcardMode", () => {
  it("returns 'neighbor' when primary is neighbor regardless of subMode", () => {
    expect(toFlashcardMode("neighbor", "cardonly")).toBe("neighbor");
    expect(toFlashcardMode("neighbor", "numberonly")).toBe("neighbor");
    expect(toFlashcardMode("neighbor", "bothmodes")).toBe("neighbor");
  });

  it("returns the subMode when primary is position", () => {
    expect(toFlashcardMode("position", "cardonly")).toBe("cardonly");
    expect(toFlashcardMode("position", "numberonly")).toBe("numberonly");
    expect(toFlashcardMode("position", "bothmodes")).toBe("bothmodes");
  });
});

describe("isPrimaryMode", () => {
  it("returns true for valid primary modes", () => {
    expect(isPrimaryMode("position")).toBe(true);
    expect(isPrimaryMode("neighbor")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isPrimaryMode("cardonly")).toBe(false);
    expect(isPrimaryMode("bothmodes")).toBe(false);
    expect(isPrimaryMode("")).toBe(false);
    expect(isPrimaryMode("invalid")).toBe(false);
  });
});

describe("isPositionSubMode", () => {
  it("returns true for valid position sub modes", () => {
    expect(isPositionSubMode("cardonly")).toBe(true);
    expect(isPositionSubMode("numberonly")).toBe(true);
    expect(isPositionSubMode("bothmodes")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isPositionSubMode("neighbor")).toBe(false);
    expect(isPositionSubMode("position")).toBe(false);
    expect(isPositionSubMode("")).toBe(false);
    expect(isPositionSubMode("invalid")).toBe(false);
  });
});

describe("isFlashcardMode", () => {
  it("returns true for all valid flashcard modes", () => {
    expect(isFlashcardMode("cardonly")).toBe(true);
    expect(isFlashcardMode("numberonly")).toBe(true);
    expect(isFlashcardMode("bothmodes")).toBe(true);
    expect(isFlashcardMode("neighbor")).toBe(true);
  });

  it("returns false for 'position' which is a primary mode, not a flashcard mode", () => {
    expect(isFlashcardMode("position")).toBe(false);
  });

  it("returns false for invalid strings", () => {
    expect(isFlashcardMode("invalid")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isFlashcardMode("")).toBe(false);
  });
});

describe("isNeighborDirection", () => {
  it("returns true for 'before'", () => {
    expect(isNeighborDirection("before")).toBe(true);
  });

  it("returns true for 'after'", () => {
    expect(isNeighborDirection("after")).toBe(true);
  });

  it("returns true for 'random'", () => {
    expect(isNeighborDirection("random")).toBe(true);
  });

  it("returns false for 'neighbor' which is a mode, not a direction", () => {
    expect(isNeighborDirection("neighbor")).toBe(false);
  });

  it("returns false for invalid strings", () => {
    expect(isNeighborDirection("invalid")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isNeighborDirection("")).toBe(false);
  });
});
