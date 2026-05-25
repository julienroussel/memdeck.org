import { renderHook } from "@testing-library/react";
import i18n from "i18next";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import esLocale from "../i18n/locales/es.json";
import { getLetterCount } from "../pages/toolbox/spell-card";
import { TwoOfClubs } from "../types/suits/clubs";
import { QueenOfDiamonds } from "../types/suits/diamonds";
import { AceOfHearts, SevenOfHearts } from "../types/suits/hearts";
import { KingOfSpades } from "../types/suits/spades";
import { useFormatCardName } from "./use-format-card-name";

describe("useFormatCardName", () => {
  it("formats Ace of Hearts as 'Ace of Hearts'", () => {
    const { result } = renderHook(() => useFormatCardName());
    expect(result.current(AceOfHearts)).toBe("Ace of Hearts");
  });

  it("formats King of Spades as 'King of Spades'", () => {
    const { result } = renderHook(() => useFormatCardName());
    expect(result.current(KingOfSpades)).toBe("King of Spades");
  });

  it("spells numeric rank cards (Two of Clubs, not 2 of Clubs)", () => {
    const { result } = renderHook(() => useFormatCardName());
    expect(result.current(TwoOfClubs)).toBe("Two of Clubs");
  });

  it("formats Queen of Diamonds as 'Queen of Diamonds'", () => {
    const { result } = renderHook(() => useFormatCardName());
    expect(result.current(QueenOfDiamonds)).toBe("Queen of Diamonds");
  });

  it("returns a stable callback reference across renders", () => {
    const { result, rerender } = renderHook(() => useFormatCardName());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  describe("Spanish locale (Santi's reported bug)", () => {
    beforeAll(async () => {
      i18n.addResourceBundle("es", "translation", esLocale);
      await i18n.changeLanguage("es");
    });

    afterAll(async () => {
      await i18n.changeLanguage("en");
      i18n.removeResourceBundle("es", "translation");
    });

    it("spells the 7 of Hearts as 'Siete de Corazones' (16 letters)", () => {
      const { result } = renderHook(() => useFormatCardName());
      const name = result.current(SevenOfHearts);
      expect(name).toBe("Siete de Corazones");
      expect(getLetterCount(name)).toBe(16);
    });

    it("spells the 2 of Clubs as 'Dos de Tréboles'", () => {
      const { result } = renderHook(() => useFormatCardName());
      expect(result.current(TwoOfClubs)).toBe("Dos de Tréboles");
    });

    it("formats the King of Spades as 'Rey de Picas'", () => {
      const { result } = renderHook(() => useFormatCardName());
      expect(result.current(KingOfSpades)).toBe("Rey de Picas");
    });
  });
});
