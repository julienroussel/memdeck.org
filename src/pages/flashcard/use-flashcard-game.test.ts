import { describe, expect, it, vi } from "vitest";
import type { PlayingCard } from "../../types/playingcard";
import { createDeckPosition, stacks } from "../../types/stacks";
import {
  generateNewCardAndChoices,
  isCorrectAnswer,
} from "./use-flashcard-game";

const testStack = stacks.mnemonica.order;

describe("generateNewCardAndChoices", () => {
  it("returns a valid card position", () => {
    const { card } = generateNewCardAndChoices(testStack);

    expect(card.index).toBeGreaterThanOrEqual(1);
    expect(card.index).toBeLessThanOrEqual(52);
    expect(card.card).toBeDefined();
    expect(card.card.suit).toBeDefined();
    expect(card.card.rank).toBeDefined();
  });

  it("returns 5 choices", () => {
    const { choices } = generateNewCardAndChoices(testStack);

    expect(choices).toHaveLength(5);
  });

  it("includes the target card in choices", () => {
    const { card, choices } = generateNewCardAndChoices(testStack);

    const hasTargetCard = choices.some(
      (c) => c.card.suit === card.card.suit && c.card.rank === card.card.rank
    );
    expect(hasTargetCard).toBe(true);
  });

  it("returns unique choices", () => {
    const { choices } = generateNewCardAndChoices(testStack);

    const indices = choices.map((c) => c.index);
    const uniqueIndices = new Set(indices);
    expect(uniqueIndices.size).toBe(5);
  });

  it("shuffles the choices", () => {
    // Run multiple times to verify shuffling occurs
    const results = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const { choices } = generateNewCardAndChoices(testStack);
      const order = choices.map((c) => c.index).join(",");
      results.add(order);
    }

    // With shuffling, we should see multiple different orderings
    expect(results.size).toBeGreaterThan(1);
  });

  it("works with different stacks", () => {
    const aronsonResult = generateNewCardAndChoices(stacks.aronson.order);
    const redfordResult = generateNewCardAndChoices(stacks.redford.order);

    expect(aronsonResult.choices).toHaveLength(5);
    expect(redfordResult.choices).toHaveLength(5);
  });

  it("returns card from the provided stack", () => {
    const { card } = generateNewCardAndChoices(testStack);

    const cardInStack = testStack.some(
      (c) => c.suit === card.card.suit && c.rank === card.card.rank
    );
    expect(cardInStack).toBe(true);
  });

  it("returns choices from the provided stack", () => {
    const { choices } = generateNewCardAndChoices(testStack);

    for (const choice of choices) {
      const cardInStack = testStack.some(
        (c) => c.suit === choice.card.suit && c.rank === choice.card.rank
      );
      expect(cardInStack).toBe(true);
    }
  });
});

describe("isCorrectAnswer", () => {
  const testCard = {
    index: createDeckPosition(10),
    card: testStack[9],
  };

  describe("with PlayingCard answer", () => {
    it("returns true when card matches by suit and rank", () => {
      const answer = testCard.card;

      expect(isCorrectAnswer(answer, testCard)).toBe(true);
    });

    it("returns true for card with same suit and rank but different reference", () => {
      const answer: PlayingCard = { ...testCard.card };

      expect(isCorrectAnswer(answer, testCard)).toBe(true);
    });

    it("returns false when suit differs", () => {
      const differentSuitCard = testStack.find(
        (c) => c.suit !== testCard.card.suit
      );

      if (differentSuitCard) {
        expect(isCorrectAnswer(differentSuitCard, testCard)).toBe(false);
      }
    });

    it("returns false when rank differs", () => {
      const differentRankCard = testStack.find(
        (c) => c.suit === testCard.card.suit && c.rank !== testCard.card.rank
      );

      if (differentRankCard) {
        expect(isCorrectAnswer(differentRankCard, testCard)).toBe(false);
      }
    });

    it("returns false when both suit and rank differ", () => {
      const differentCard = testStack.find(
        (c) => c.suit !== testCard.card.suit && c.rank !== testCard.card.rank
      );

      if (differentCard) {
        expect(isCorrectAnswer(differentCard, testCard)).toBe(false);
      }
    });
  });

  describe("with number answer", () => {
    it("returns true when index matches exactly", () => {
      expect(isCorrectAnswer(testCard.index, testCard)).toBe(true);
    });

    it("returns false when index differs by one", () => {
      expect(isCorrectAnswer(testCard.index + 1, testCard)).toBe(false);
      expect(isCorrectAnswer(testCard.index - 1, testCard)).toBe(false);
    });

    it("returns false for zero", () => {
      expect(isCorrectAnswer(0, testCard)).toBe(false);
    });

    it("returns false for negative numbers", () => {
      expect(isCorrectAnswer(-1, testCard)).toBe(false);
    });

    it("returns false for numbers outside valid range", () => {
      expect(isCorrectAnswer(53, testCard)).toBe(false);
      expect(isCorrectAnswer(100, testCard)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("correctly handles index 1", () => {
      const firstCard = {
        index: createDeckPosition(1),
        card: testStack[0],
      };

      expect(isCorrectAnswer(1, firstCard)).toBe(true);
      expect(isCorrectAnswer(2, firstCard)).toBe(false);
    });

    it("correctly handles index 52", () => {
      const lastCard = {
        index: createDeckPosition(52),
        card: testStack[51],
      };

      expect(isCorrectAnswer(52, lastCard)).toBe(true);
      expect(isCorrectAnswer(51, lastCard)).toBe(false);
    });

    it("distinguishes between card and number answers", () => {
      // A number that matches the index should return true
      expect(isCorrectAnswer(testCard.index, testCard)).toBe(true);

      // The card itself should also return true
      expect(isCorrectAnswer(testCard.card, testCard)).toBe(true);
    });
  });
});

describe("flashcard game utils", () => {
  it("getRandomDisplayMode returns card or index", async () => {
    const { getRandomDisplayMode } = await import("./utils");

    const results = new Set<string>();

    for (let i = 0; i < 100; i++) {
      results.add(getRandomDisplayMode());
    }

    expect(results.has("card") || results.has("index")).toBe(true);
  });

  it("getRandomDisplayMode with mocked random returns card", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { getRandomDisplayMode } = await import("./utils");
    const result = getRandomDisplayMode();

    expect(result).toBe("card");

    vi.restoreAllMocks();
  });

  it("getRandomDisplayMode with mocked random returns index", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const { getRandomDisplayMode } = await import("./utils");
    const result = getRandomDisplayMode();

    expect(result).toBe("index");

    vi.restoreAllMocks();
  });

  it("wrongAnswerNotification has correct properties", async () => {
    const { wrongAnswerNotification } = await import("./utils");

    expect(wrongAnswerNotification.color).toBe("red");
    expect(wrongAnswerNotification.title).toBe("Wrong answer");
    expect(wrongAnswerNotification.message).toBe("Try again!");
    expect(wrongAnswerNotification.autoClose).toBeDefined();
  });
});
