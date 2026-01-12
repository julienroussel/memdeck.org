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

  it("formats number cards correctly", () => {
    expect(formatCardName(SevenOfClubs)).toBe("7 of Clubs");
  });

  it("formats 10 correctly", () => {
    expect(formatCardName(TenOfDiamonds)).toBe("10 of Diamonds");
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

  it("capitalizes suit names", () => {
    expect(formatCardName(TwoOfSpades)).toBe("2 of Spades");
  });
});
