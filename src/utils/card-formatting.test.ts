import { describe, expect, it } from "vitest";
import { SevenOfClubs } from "../types/suits/clubs";
import { KingOfDiamonds, TenOfDiamonds } from "../types/suits/diamonds";
import { AceOfHearts, QueenOfHearts } from "../types/suits/hearts";
import { JackOfSpades, TwoOfSpades } from "../types/suits/spades";
import { formatCardName } from "./card-formatting";

describe("formatCardName", () => {
  it("formats Ace correctly", () => {
    expect(formatCardName(AceOfHearts)).toBe("Ace of Hearts");
  });

  it("spells number cards (Seven, not 7)", () => {
    expect(formatCardName(SevenOfClubs)).toBe("Seven of Clubs");
  });

  it("spells 10 as 'Ten'", () => {
    expect(formatCardName(TenOfDiamonds)).toBe("Ten of Diamonds");
  });

  it("formats Jack correctly", () => {
    expect(formatCardName(JackOfSpades)).toBe("Jack of Spades");
  });

  it("formats Queen correctly", () => {
    expect(formatCardName(QueenOfHearts)).toBe("Queen of Hearts");
  });

  it("formats King correctly", () => {
    expect(formatCardName(KingOfDiamonds)).toBe("King of Diamonds");
  });

  it("spells 2 as 'Two'", () => {
    expect(formatCardName(TwoOfSpades)).toBe("Two of Spades");
  });
});
