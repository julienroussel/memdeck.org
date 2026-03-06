import { describe, expect, it } from "vitest";
import type { PlayingCardPosition } from "../../types/stacks";
import { createDeckPosition } from "../../types/stacks";
import { mnemonica } from "../../types/stacks/mnemonica";
import { FourOfClubs, TwoOfClubs } from "../../types/suits/clubs";
import { AceOfHearts, TwoOfHearts } from "../../types/suits/hearts";
import type { GameState } from "./flashcard-game-reducer";
import {
  createInitialState,
  gameReducer,
  generateNeighborCardAndChoices,
  generateNewCardAndChoices,
  isCorrectAnswer,
} from "./flashcard-game-reducer";

const stackOrder = mnemonica.order;

const makeCardPosition = (
  card: PlayingCardPosition["card"],
  index: number
): PlayingCardPosition => ({
  card,
  index: createDeckPosition(index),
});

// FourOfClubs is position 1 in mnemonica
const cardAtPos1 = makeCardPosition(FourOfClubs, 1);
// TwoOfHearts is position 2 in mnemonica
const cardAtPos2 = makeCardPosition(TwoOfHearts, 2);

const makeChoices = (): PlayingCardPosition[] => [
  cardAtPos1,
  cardAtPos2,
  makeCardPosition(AceOfHearts, 51),
  makeCardPosition(TwoOfClubs, 27),
  makeCardPosition(FourOfClubs, 1),
];

const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  successes: 0,
  fails: 0,
  card: cardAtPos1,
  answerCard: cardAtPos1,
  choices: makeChoices(),
  display: "card",
  resolvedDirection: null,
  timeRemaining: 30,
  timerDuration: 30,
  ...overrides,
});

describe("generateNewCardAndChoices", () => {
  it("returns a card and a non-empty choices array", () => {
    const result = generateNewCardAndChoices(stackOrder);
    expect(result.card.index).toBeGreaterThanOrEqual(1);
    expect(result.choices.length).toBeGreaterThan(0);
  });

  it("returns a card with a valid index between 1 and 52", () => {
    const { card } = generateNewCardAndChoices(stackOrder);
    expect(card.index).toBeGreaterThanOrEqual(1);
    expect(card.index).toBeLessThanOrEqual(52);
  });

  it("returns a card with a defined suit, rank, and image", () => {
    const { card } = generateNewCardAndChoices(stackOrder);
    expect(typeof card.card.suit).toBe("string");
    expect(typeof card.card.rank).toBe("string");
    expect(typeof card.card.image).toBe("string");
  });

  it("returns a choices array with the default count of items", () => {
    const { choices } = generateNewCardAndChoices(stackOrder);
    // DEFAULT_CHOICES_COUNT is 5
    expect(choices).toHaveLength(5);
  });

  it("returns all choices with valid indices between 1 and 52", () => {
    const { choices } = generateNewCardAndChoices(stackOrder);
    for (const choice of choices) {
      expect(choice.index).toBeGreaterThanOrEqual(1);
      expect(choice.index).toBeLessThanOrEqual(52);
    }
  });

  it("returns choices where each has a valid card and index", () => {
    const { choices } = generateNewCardAndChoices(stackOrder);
    for (const choice of choices) {
      expect(typeof choice.card.suit).toBe("string");
      expect(choice.index).toBeGreaterThanOrEqual(1);
      expect(choice.index).toBeLessThanOrEqual(52);
    }
  });

  it("includes the selected card among the choices", () => {
    const { card, choices } = generateNewCardAndChoices(stackOrder);
    const found = choices.some((c) => c.index === card.index);
    expect(found).toBe(true);
  });

  it("returns choices with unique indices (no duplicate positions)", () => {
    const { choices } = generateNewCardAndChoices(stackOrder);
    const indices = choices.map((c) => c.index);
    const unique = new Set(indices);
    expect(unique.size).toBe(indices.length);
  });

  // Intentionally probabilistic: with 52 possible cards and 20 draws, the
  // probability of all 20 being identical is (1/52)^19 ≈ 1.6e-33 — effectively zero.
  it("produces varying cards across multiple consecutive calls", () => {
    const results = Array.from({ length: 20 }, () =>
      generateNewCardAndChoices(stackOrder)
    );
    const uniqueIndices = new Set(results.map((r) => r.card.index));
    expect(uniqueIndices.size).toBeGreaterThan(1);
  });
});

describe("generateNeighborCardAndChoices", () => {
  it("returns a question card, a different answer card, choices, and a resolved direction", () => {
    const result = generateNeighborCardAndChoices(stackOrder, "before");

    expect(result.card.index).toBeGreaterThanOrEqual(1);
    expect(result.answerCard.index).toBeGreaterThanOrEqual(1);
    expect(result.choices.length).toBeGreaterThan(0);
    expect(["before", "after"]).toContain(result.resolvedDirection);
  });

  it("sets answer card to the neighbor of the question card for 'before' direction", () => {
    const result = generateNeighborCardAndChoices(stackOrder, "before");

    // The answer should be the card before the question in the stack
    expect(result.resolvedDirection).toBe("before");
    // The question and answer indices should differ by 1 (with wrap-around)
    const expectedIndex = result.card.index === 1 ? 52 : result.card.index - 1;
    expect(result.answerCard.index).toBe(expectedIndex);
  });

  it("sets answer card to the neighbor of the question card for 'after' direction", () => {
    const result = generateNeighborCardAndChoices(stackOrder, "after");

    expect(result.resolvedDirection).toBe("after");
    const expectedIndex = result.card.index === 52 ? 1 : result.card.index + 1;
    expect(result.answerCard.index).toBe(expectedIndex);
  });

  it("resolves 'random' direction to 'before' or 'after'", () => {
    const directions = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = generateNeighborCardAndChoices(stackOrder, "random");
      directions.add(result.resolvedDirection);
    }
    expect(directions.has("before")).toBe(true);
    expect(directions.has("after")).toBe(true);
    for (const d of directions) {
      expect(["before", "after"]).toContain(d);
    }
  });

  it("includes the answer card in choices but not the question card", () => {
    for (let i = 0; i < 10; i++) {
      const result = generateNeighborCardAndChoices(stackOrder, "before");

      const hasAnswer = result.choices.some(
        (c) =>
          c.card.suit === result.answerCard.card.suit &&
          c.card.rank === result.answerCard.card.rank
      );
      expect(hasAnswer).toBe(true);

      const hasQuestion = result.choices.some(
        (c) =>
          c.card.suit === result.card.card.suit &&
          c.card.rank === result.card.card.rank
      );
      expect(hasQuestion).toBe(false);
    }
  });

  it("shuffles choices so the answer is not always first", () => {
    const answerPositions = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const result = generateNeighborCardAndChoices(stackOrder, "before");
      const answerIndex = result.choices.findIndex(
        (c) =>
          c.card.suit === result.answerCard.card.suit &&
          c.card.rank === result.answerCard.card.rank
      );
      answerPositions.add(answerIndex);
    }
    // The answer should appear at multiple positions, not always at 0
    expect(answerPositions.size).toBeGreaterThan(1);
  });
});

describe("isCorrectAnswer", () => {
  describe("when item is a PlayingCard", () => {
    it("returns true when suit and rank match the card at the position", () => {
      expect(isCorrectAnswer(FourOfClubs, cardAtPos1)).toBe(true);
    });

    it("returns false when suit matches but rank does not", () => {
      const wrongCard = TwoOfClubs;
      expect(isCorrectAnswer(wrongCard, cardAtPos1)).toBe(false);
    });

    it("returns false when rank matches but suit does not", () => {
      const wrongCard = TwoOfHearts;
      // TwoOfHearts has rank "2", TwoOfClubs has rank "2" but different suit
      expect(isCorrectAnswer(wrongCard, cardAtPos1)).toBe(false);
    });

    it("returns false when card is completely different", () => {
      expect(isCorrectAnswer(AceOfHearts, cardAtPos1)).toBe(false);
    });
  });

  describe("when item is a number", () => {
    it("returns true when number matches the card's 1-based index", () => {
      expect(isCorrectAnswer(1, cardAtPos1)).toBe(true);
    });

    it("returns false when number does not match the card's index", () => {
      expect(isCorrectAnswer(2, cardAtPos1)).toBe(false);
    });

    it("returns false when number is 0", () => {
      expect(isCorrectAnswer(0, cardAtPos1)).toBe(false);
    });

    it("returns false when number is greater than 52", () => {
      expect(isCorrectAnswer(53, cardAtPos1)).toBe(false);
    });

    it("returns true for the correct index of a different card position", () => {
      expect(isCorrectAnswer(2, cardAtPos2)).toBe(true);
    });

    it("returns false when number is negative", () => {
      expect(isCorrectAnswer(-1, cardAtPos1)).toBe(false);
    });
  });
});

describe("createInitialState", () => {
  it("returns state with zero successes and fails", () => {
    const state = createInitialState({ stackOrder, timerDuration: 30 });
    expect(state.successes).toBe(0);
    expect(state.fails).toBe(0);
  });

  it("sets timeRemaining equal to the provided timerDuration", () => {
    const state = createInitialState({ stackOrder, timerDuration: 45 });
    expect(state.timeRemaining).toBe(45);
  });

  it("sets timerDuration to the provided value", () => {
    const state = createInitialState({ stackOrder, timerDuration: 45 });
    expect(state.timerDuration).toBe(45);
  });

  it("defaults display mode to 'card'", () => {
    const state = createInitialState({ stackOrder, timerDuration: 30 });
    expect(state.display).toBe("card");
  });

  it("assigns a card with a valid deck position between 1 and 52", () => {
    const state = createInitialState({ stackOrder, timerDuration: 30 });
    expect(state.card.index).toBeGreaterThanOrEqual(1);
    expect(state.card.index).toBeLessThanOrEqual(52);
    expect(typeof state.card.card.suit).toBe("string");
  });

  it("includes a choices array", () => {
    const state = createInitialState({ stackOrder, timerDuration: 30 });
    expect(Array.isArray(state.choices)).toBe(true);
    expect(state.choices.length).toBeGreaterThan(0);
  });

  it("includes the card among the choices", () => {
    const state = createInitialState({ stackOrder, timerDuration: 30 });
    const found = state.choices.some((c) => c.index === state.card.index);
    expect(found).toBe(true);
  });

  it("works with different timer durations", () => {
    const state = createInitialState({ stackOrder, timerDuration: 60 });
    expect(state.timeRemaining).toBe(60);
    expect(state.timerDuration).toBe(60);
  });

  it("generates a neighbor question when flashcardMode is 'neighbor'", () => {
    const state = createInitialState({
      stackOrder,
      timerDuration: 30,
      flashcardMode: "neighbor",
      neighborDirection: "before",
    });
    expect(state.resolvedDirection).toBe("before");
    expect(state.answerCard).not.toBe(state.card);
  });

  it("resolves direction for neighbor mode with 'after'", () => {
    const state = createInitialState({
      stackOrder,
      timerDuration: 30,
      flashcardMode: "neighbor",
      neighborDirection: "after",
    });
    expect(state.resolvedDirection).toBe("after");
  });

  it("resolves random direction to 'before' or 'after' in neighbor mode", () => {
    const state = createInitialState({
      stackOrder,
      timerDuration: 30,
      flashcardMode: "neighbor",
      neighborDirection: "random",
    });
    expect(["before", "after"]).toContain(state.resolvedDirection);
  });

  it("generates a standard question when flashcardMode is not 'neighbor'", () => {
    const state = createInitialState({
      stackOrder,
      timerDuration: 30,
      flashcardMode: "cardonly",
    });
    expect(state.resolvedDirection).toBeNull();
    expect(state.answerCard).toBe(state.card);
  });

  it("generates a standard question when flashcardMode is undefined", () => {
    const state = createInitialState({ stackOrder, timerDuration: 30 });
    expect(state.resolvedDirection).toBeNull();
    expect(state.answerCard).toBe(state.card);
  });
});

describe("gameReducer", () => {
  const newCard = makeCardPosition(TwoOfHearts, 2);
  const newChoices = makeChoices();

  describe("CORRECT_ANSWER", () => {
    it("increments successes by 1", () => {
      const state = makeState({ successes: 3 });
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.successes).toBe(4);
    });

    it("does not change fails", () => {
      const state = makeState({ fails: 2 });
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.fails).toBe(2);
    });

    it("replaces card with the new card from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.card).toBe(newCard);
      expect(next.answerCard).toBe(newCard);
      expect(next.resolvedDirection).toBeNull();
    });

    it("replaces choices with the new choices from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "index",
          newResolvedDirection: null,
        },
      });
      expect(next.choices).toBe(newChoices);
    });

    it("sets display to the new display mode from payload", () => {
      const state = makeState({ display: "card" });
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "index",
          newResolvedDirection: null,
        },
      });
      expect(next.display).toBe("index");
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = makeState({ timeRemaining: 5, timerDuration: 30 });
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.timeRemaining).toBe(30);
    });

    it("updates answerCard and resolvedDirection with neighbor mode payload", () => {
      const newAnswerCard = makeCardPosition(AceOfHearts, 51);
      const state = makeState();
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: {
          newCard,
          newAnswerCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: "before",
        },
      });
      expect(next.card).toBe(newCard);
      expect(next.answerCard).toBe(newAnswerCard);
      expect(next.answerCard).not.toBe(next.card);
      expect(next.resolvedDirection).toBe("before");
    });
  });

  describe("WRONG_ANSWER", () => {
    it("increments fails by 1", () => {
      const state = makeState({ fails: 0 });
      const next = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(next.fails).toBe(1);
    });

    it("does not change successes", () => {
      const state = makeState({ successes: 5 });
      const next = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(next.successes).toBe(5);
    });

    it("does not reset the timer or advance to the next card", () => {
      const state = makeState({ timeRemaining: 15, card: cardAtPos1 });
      const next = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(next.timeRemaining).toBe(15);
      expect(next.card).toBe(cardAtPos1);
    });

    it("does not change choices or display", () => {
      const choices = makeChoices();
      const state = makeState({ choices, display: "index" });
      const next = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(next.choices).toBe(choices);
      expect(next.display).toBe("index");
    });

    it("accumulates fails across multiple wrong answers", () => {
      let state = makeState();
      state = gameReducer(state, { type: "WRONG_ANSWER" });
      state = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(state.fails).toBe(2);
    });
  });

  describe("TIMEOUT", () => {
    it("increments fails by 1", () => {
      const state = makeState({ fails: 1 });
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.fails).toBe(2);
    });

    it("replaces card with the new card from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.card).toBe(newCard);
      expect(next.answerCard).toBe(newCard);
      expect(next.resolvedDirection).toBeNull();
    });

    it("replaces choices with the new choices from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.choices).toBe(newChoices);
    });

    it("sets display to the new display from payload", () => {
      const state = makeState({ display: "card" });
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "index",
          newResolvedDirection: null,
        },
      });
      expect(next.display).toBe("index");
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = makeState({ timeRemaining: 0, timerDuration: 30 });
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.timeRemaining).toBe(30);
    });

    it("does not change successes", () => {
      const state = makeState({ successes: 4 });
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.successes).toBe(4);
    });
  });

  describe("REVEAL_ANSWER", () => {
    it("increments fails by 1", () => {
      const state = makeState({ fails: 0 });
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.fails).toBe(1);
    });

    it("replaces card with the new card from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.card).toBe(newCard);
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = makeState({ timeRemaining: 12, timerDuration: 30 });
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.timeRemaining).toBe(30);
    });

    it("does not change successes", () => {
      const state = makeState({ successes: 9 });
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "card",
          newResolvedDirection: null,
        },
      });
      expect(next.successes).toBe(9);
    });

    it("behaves identically to TIMEOUT (shared case)", () => {
      const state = makeState({ fails: 1, successes: 2, timeRemaining: 3 });
      const fromTimeout = gameReducer(state, {
        type: "TIMEOUT",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "index",
          newResolvedDirection: null,
        },
      });
      const fromReveal = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: {
          newCard,
          newAnswerCard: newCard,
          newChoices,
          newDisplay: "index",
          newResolvedDirection: null,
        },
      });
      expect(fromReveal).toEqual(fromTimeout);
    });
  });

  describe("TICK", () => {
    it("decrements timeRemaining by 1", () => {
      const state = makeState({ timeRemaining: 10 });
      const next = gameReducer(state, { type: "TICK" });
      expect(next.timeRemaining).toBe(9);
    });

    it("does not decrement below 0", () => {
      const state = makeState({ timeRemaining: 0 });
      const next = gameReducer(state, { type: "TICK" });
      expect(next.timeRemaining).toBe(0);
    });

    it("decrements from 1 to 0", () => {
      const state = makeState({ timeRemaining: 1 });
      const next = gameReducer(state, { type: "TICK" });
      expect(next.timeRemaining).toBe(0);
    });

    it("does not change successes, fails, card, choices, or display", () => {
      const choices = makeChoices();
      const state = makeState({
        successes: 3,
        fails: 2,
        timeRemaining: 5,
        choices,
        display: "index",
      });
      const next = gameReducer(state, { type: "TICK" });
      expect(next.successes).toBe(3);
      expect(next.fails).toBe(2);
      expect(next.card).toBe(cardAtPos1);
      expect(next.choices).toBe(choices);
      expect(next.display).toBe("index");
    });
  });

  describe("RESET_TIMER", () => {
    it("sets timeRemaining to the provided duration", () => {
      const state = makeState({ timeRemaining: 5 });
      const next = gameReducer(state, {
        type: "RESET_TIMER",
        payload: { duration: 60 },
      });
      expect(next.timeRemaining).toBe(60);
    });

    it("updates timerDuration to the provided duration", () => {
      const state = makeState({ timerDuration: 30 });
      const next = gameReducer(state, {
        type: "RESET_TIMER",
        payload: { duration: 45 },
      });
      expect(next.timerDuration).toBe(45);
    });

    it("does not change successes, fails, card, choices, or display", () => {
      const choices = makeChoices();
      const state = makeState({ successes: 4, fails: 1, choices });
      const next = gameReducer(state, {
        type: "RESET_TIMER",
        payload: { duration: 30 },
      });
      expect(next.successes).toBe(4);
      expect(next.fails).toBe(1);
      expect(next.card).toBe(cardAtPos1);
      expect(next.choices).toBe(choices);
    });
  });

  describe("RESET_GAME", () => {
    it("resets successes and fails to 0", () => {
      const state = makeState({ successes: 10, fails: 5 });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 30 },
      });
      expect(next.successes).toBe(0);
      expect(next.fails).toBe(0);
    });

    it("resets timeRemaining and timerDuration to the provided value", () => {
      const state = makeState({ timeRemaining: 5, timerDuration: 30 });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 60 },
      });
      expect(next.timeRemaining).toBe(60);
      expect(next.timerDuration).toBe(60);
    });

    it("resets display to 'card'", () => {
      const state = makeState({ display: "index" });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 30 },
      });
      expect(next.display).toBe("card");
    });

    it("generates a new card with a valid deck position from the provided stack", () => {
      const state = makeState({ successes: 5 });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 30 },
      });
      expect(next.card.index).toBeGreaterThanOrEqual(1);
      expect(next.card.index).toBeLessThanOrEqual(52);
      expect(typeof next.card.card.suit).toBe("string");
    });

    it("generates a choices array from the provided stack", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 30 },
      });
      expect(Array.isArray(next.choices)).toBe(true);
      expect(next.choices.length).toBeGreaterThan(0);
    });

    it("returns a complete fresh GameState", () => {
      const state = makeState({ successes: 99, fails: 99, timeRemaining: 1 });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 30 },
      });
      expect(next.successes).toBe(0);
      expect(next.fails).toBe(0);
      expect(next.timeRemaining).toBe(30);
      expect(next.timerDuration).toBe(30);
      expect(next.display).toBe("card");
    });

    it("resets to neighbor mode when flashcardMode is 'neighbor' with neighborDirection", () => {
      const state = makeState({ successes: 10, fails: 5 });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: {
          stackOrder,
          timerDuration: 30,
          flashcardMode: "neighbor",
          neighborDirection: "before",
        },
      });

      expect(next.successes).toBe(0);
      expect(next.fails).toBe(0);
      expect(next.resolvedDirection).toBe("before");
      expect(next.answerCard).not.toBe(next.card);
    });

    it("sets resolvedDirection and produces a different answerCard than card in neighbor mode", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: {
          stackOrder,
          timerDuration: 30,
          flashcardMode: "neighbor",
          neighborDirection: "after",
        },
      });

      expect(next.resolvedDirection).toBe("after");
      expect(next.answerCard.index).not.toBe(next.card.index);
    });

    it("resolves random direction in neighbor mode RESET_GAME", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: {
          stackOrder,
          timerDuration: 30,
          flashcardMode: "neighbor",
          neighborDirection: "random",
        },
      });

      expect(["before", "after"]).toContain(next.resolvedDirection);
      expect(next.answerCard.index).not.toBe(next.card.index);
    });
  });
});
