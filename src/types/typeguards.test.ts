import { describe, expect, it } from "vitest";
import { stacks } from "./stacks";
import { cardItems, isPlayingCard, numberItems } from "./typeguards";

const testCard = stacks.mnemonica.order[0];

describe("cardItems", () => {
  it("returns object with type 'cards' and data", () => {
    const cards = [testCard];
    const result = cardItems(cards);

    expect(result.type).toBe("cards");
    expect(result.data).toBe(cards);
  });

  it("works with empty array", () => {
    const result = cardItems([]);

    expect(result.type).toBe("cards");
    expect(result.data).toEqual([]);
  });

  it("works with multiple cards", () => {
    const cards = stacks.mnemonica.order.slice(0, 5);
    const result = cardItems(cards);

    expect(result.type).toBe("cards");
    expect(result.data).toHaveLength(5);
  });

  it("preserves card references", () => {
    const cards = [testCard];
    const result = cardItems(cards);

    expect(result.data[0]).toBe(testCard);
  });
});

describe("numberItems", () => {
  it("returns object with type 'numbers' and data", () => {
    const numbers = [1, 2, 3];
    const result = numberItems(numbers);

    expect(result.type).toBe("numbers");
    expect(result.data).toBe(numbers);
  });

  it("works with empty array", () => {
    const result = numberItems([]);

    expect(result.type).toBe("numbers");
    expect(result.data).toEqual([]);
  });

  it("works with single number", () => {
    const result = numberItems([42]);

    expect(result.type).toBe("numbers");
    expect(result.data).toEqual([42]);
  });

  it("works with stack position numbers", () => {
    const positions = [1, 10, 25, 52];
    const result = numberItems(positions);

    expect(result.type).toBe("numbers");
    expect(result.data).toEqual([1, 10, 25, 52]);
  });
});

describe("isPlayingCard", () => {
  it("returns true for valid PlayingCard objects", () => {
    expect(isPlayingCard(testCard)).toBe(true);
  });

  it("returns true for all cards in a stack", () => {
    for (const card of stacks.mnemonica.order) {
      expect(isPlayingCard(card)).toBe(true);
    }
  });

  it("returns false for numbers", () => {
    expect(isPlayingCard(1)).toBe(false);
    expect(isPlayingCard(0)).toBe(false);
    expect(isPlayingCard(52)).toBe(false);
    expect(isPlayingCard(-1)).toBe(false);
  });

  it("returns false for objects missing suit", () => {
    const invalid = { rank: "A", image: "test.svg" };
    expect(isPlayingCard(invalid as never)).toBe(false);
  });

  it("returns false for objects missing rank", () => {
    const invalid = { suit: "hearts", image: "test.svg" };
    expect(isPlayingCard(invalid as never)).toBe(false);
  });

  it("returns false for objects missing image", () => {
    const invalid = { suit: "hearts", rank: "A" };
    expect(isPlayingCard(invalid as never)).toBe(false);
  });

  it("returns true for objects with all required properties", () => {
    const valid = { suit: "hearts", rank: "A", image: "test.svg" };
    expect(isPlayingCard(valid as never)).toBe(true);
  });

  it("returns true for objects with extra properties", () => {
    const valid = { suit: "hearts", rank: "A", image: "test.svg", extra: true };
    expect(isPlayingCard(valid as never)).toBe(true);
  });

  it("works as a type guard in conditional logic", () => {
    const items: (typeof testCard | number)[] = [testCard, 5, 10];

    const cards = items.filter(isPlayingCard);
    const numbers = items.filter((item) => !isPlayingCard(item));

    expect(cards).toHaveLength(1);
    expect(cards[0]).toBe(testCard);
    expect(numbers).toHaveLength(2);
    expect(numbers).toEqual([5, 10]);
  });
});
