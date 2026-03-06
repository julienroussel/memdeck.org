import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TwoOfClubs } from "../../types/suits/clubs";
import { QueenOfDiamonds } from "../../types/suits/diamonds";
import { AceOfHearts } from "../../types/suits/hearts";
import { KingOfSpades } from "../../types/suits/spades";
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

  it("formats numeric rank cards with their number", () => {
    const { result } = renderHook(() => useFormatCardName());
    expect(result.current(TwoOfClubs)).toBe("2 of Clubs");
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
});
