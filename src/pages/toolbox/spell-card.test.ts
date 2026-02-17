import { describe, expect, it } from "vitest";
import { stacks } from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";
import { getLetterCount, getSpellingData } from "./spell-card";

const stackOrder = stacks.mnemonica.order;

describe("getLetterCount", () => {
  it("counts letters excluding spaces", () => {
    expect(getLetterCount("Ace of Hearts")).toBe(11);
  });

  it("returns 0 for empty string", () => {
    expect(getLetterCount("")).toBe(0);
  });

  it("counts correctly with no spaces", () => {
    expect(getLetterCount("AceofHearts")).toBe(11);
  });

  it("counts correctly for short names", () => {
    expect(getLetterCount("2 of Clubs")).toBe(8);
  });

  it("counts correctly for long names", () => {
    expect(getLetterCount("Queen of Diamonds")).toBe(15);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(getLetterCount("   ")).toBe(0);
  });
});

describe("getSpellingData", () => {
  const data = getSpellingData(stackOrder, formatCardName);

  it("returns 52 entries", () => {
    expect(data).toHaveLength(52);
  });

  it("assigns correct 1-based positions", () => {
    expect(data[0].position).toBe(1);
    expect(data[51].position).toBe(52);
  });

  it("computes correct letter counts", () => {
    const aceOfClubs = data.find(
      (e) => e.card.rank === "A" && e.card.suit === "clubs"
    );
    expect(aceOfClubs).toBeDefined();
    if (!aceOfClubs) {
      return;
    }
    expect(aceOfClubs.letterCount).toBe(
      getLetterCount(formatCardName(aceOfClubs.card))
    );
  });

  it("sets landingCard to the card at the letter count position", () => {
    for (const entry of data) {
      if (entry.letterCount >= 1 && entry.letterCount <= 52) {
        expect(entry.landingCard).toBe(stackOrder[entry.letterCount - 1]);
      }
    }
  });

  it("marks isSelfSpelling only when landing card equals the card itself", () => {
    for (const entry of data) {
      if (entry.isSelfSpelling) {
        expect(entry.landingCard).toBe(entry.card);
      }
    }
  });

  it("does not mark non-self-spelling cards as self-spelling", () => {
    for (const entry of data) {
      if (entry.landingCard !== entry.card) {
        expect(entry.isSelfSpelling).toBe(false);
      }
    }
  });

  it("handles letter count out of range by setting landingCard to undefined", () => {
    const mockFormat = () => "A".repeat(100);
    const result = getSpellingData(stackOrder, mockFormat);
    for (const entry of result) {
      expect(entry.landingCard).toBeUndefined();
      expect(entry.isSelfSpelling).toBe(false);
    }
  });

  it("sets landingCard to undefined when letterCount is 0", () => {
    const emptyFormatter = () => "";
    const result = getSpellingData(stackOrder, emptyFormatter);
    for (const entry of result) {
      expect(entry.letterCount).toBe(0);
      expect(entry.landingCard).toBeUndefined();
      expect(entry.isSelfSpelling).toBe(false);
    }
  });

  it("uses the provided formatter for letter count", () => {
    const shortFormatter = () => "AB";
    const result = getSpellingData(stackOrder, shortFormatter);
    for (const entry of result) {
      expect(entry.letterCount).toBe(2);
      expect(entry.landingCard).toBe(stackOrder[1]);
    }
  });
});
