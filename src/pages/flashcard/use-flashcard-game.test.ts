import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayingCard } from "../../types/playingcard";
import type { AnswerOutcome } from "../../types/session";
import { createDeckPosition, stacks } from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";
import {
  createInitialState,
  type GameAction,
  type GameState,
  gameReducer,
  generateNewCardAndChoices,
  isCorrectAnswer,
} from "./flashcard-game-reducer";
import { useFlashcardGame } from "./use-flashcard-game";

const INDEX_ANSWER_PATTERN = /^\d+$/;

// --- Mocks for hook-level tests ---

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("../../hooks/use-flashcard-timer", () => ({
  useFlashcardTimer: () => ({
    timerSettings: { enabled: false, duration: 15 },
  }),
}));

vi.mock("../../utils/localstorage", () => ({
  useLocalDb: (_key: string, defaultValue: string) => [defaultValue],
}));

vi.mock("../../hooks/use-game-timer", () => {
  let capturedOnTimeout: (() => void) | undefined;
  return {
    timerReducerCases: {
      TICK: (state: { timeRemaining: number }) => ({
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 1),
      }),
      RESET_TIMER: (
        state: { timeRemaining: number; timerDuration: number },
        duration: number
      ) => ({
        ...state,
        timeRemaining: duration,
        timerDuration: duration,
      }),
    },
    useGameTimer: vi.fn((opts: { onTimeout?: () => void }) => {
      capturedOnTimeout = opts.onTimeout;
    }),
    __getCapturedOnTimeout: () => capturedOnTimeout,
  };
});

vi.mock("../../hooks/use-reset-game-on-stack-change", () => ({
  useResetGameOnStackChange: vi.fn(),
}));

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: { FLASHCARD_ANSWER: vi.fn() },
  },
}));

const testStack = stacks.mnemonica.order;

afterEach(() => {
  vi.clearAllMocks();
});

// Helper to create a test state with sensible defaults
const createTestState = (overrides: Partial<GameState> = {}): GameState => {
  const { card, choices } = generateNewCardAndChoices(testStack);
  return {
    successes: 0,
    fails: 0,
    card,
    choices,
    display: "card",
    timeRemaining: 15,
    timerDuration: 15,
    ...overrides,
  };
};

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

describe("createInitialState", () => {
  it("creates state with an initial card and choices from the stack", () => {
    const state = createInitialState(testStack, 15);

    expect(state.card).toBeDefined();
    expect(state.card.index).toBeGreaterThanOrEqual(1);
    expect(state.card.index).toBeLessThanOrEqual(52);
    expect(state.choices).toHaveLength(5);

    for (const choice of state.choices) {
      const cardInStack = testStack.some(
        (c) => c.suit === choice.card.suit && c.rank === choice.card.rank
      );
      expect(cardInStack).toBe(true);
    }
  });

  it("sets successes and fails to 0", () => {
    const state = createInitialState(testStack, 15);

    expect(state.successes).toBe(0);
    expect(state.fails).toBe(0);
  });

  it("sets display to card", () => {
    const state = createInitialState(testStack, 15);

    expect(state.display).toBe("card");
  });

  it("sets timeRemaining to the provided timerDuration", () => {
    const state = createInitialState(testStack, 25);

    expect(state.timeRemaining).toBe(25);
  });

  it("sets timerDuration to the provided value", () => {
    const state = createInitialState(testStack, 30);

    expect(state.timerDuration).toBe(30);
  });

  it("generates choices that include the selected card", () => {
    const state = createInitialState(testStack, 15);

    const hasSelectedCard = state.choices.some(
      (c) =>
        c.card.suit === state.card.card.suit &&
        c.card.rank === state.card.card.rank
    );
    expect(hasSelectedCard).toBe(true);
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

describe("gameReducer", () => {
  describe("REVEAL_ANSWER action", () => {
    it("increments fails", () => {
      const state = createTestState({ fails: 2 });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "REVEAL_ANSWER",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(3);
    });

    it("does not change successes", () => {
      const state = createTestState({ successes: 5 });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "REVEAL_ANSWER",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(5);
    });

    it("advances to a new card", () => {
      const state = createTestState();
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "REVEAL_ANSWER",
        payload: { newCard, newChoices, newDisplay: "index" },
      };

      const newState = gameReducer(state, action);

      expect(newState.card).toEqual(newCard);
      expect(newState.choices).toEqual(newChoices);
      expect(newState.display).toBe("index");
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = createTestState({
        timeRemaining: 3,
        timerDuration: 15,
      });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "REVEAL_ANSWER",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(15);
    });
  });

  describe("CORRECT_ANSWER action", () => {
    it("increments successes", () => {
      const state = createTestState({ successes: 2 });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(3);
    });

    it("does not change fails", () => {
      const state = createTestState({ fails: 4 });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(4);
    });

    it("advances to a new card with new choices and display", () => {
      const state = createTestState({ display: "index" });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.card).toEqual(newCard);
      expect(newState.choices).toEqual(newChoices);
      expect(newState.display).toBe("card");
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = createTestState({
        timeRemaining: 3,
        timerDuration: 15,
      });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(15);
    });
  });

  describe("WRONG_ANSWER action", () => {
    it("increments fails", () => {
      const state = createTestState({ fails: 2 });
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(3);
    });

    it("does not change successes", () => {
      const state = createTestState({ successes: 5 });
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(5);
    });

    it("does not reset the timer", () => {
      const state = createTestState({
        timeRemaining: 7,
        timerDuration: 15,
      });
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(7);
    });

    it("does not change card, choices, or display", () => {
      const state = createTestState();
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.card).toEqual(state.card);
      expect(newState.choices).toEqual(state.choices);
      expect(newState.display).toBe(state.display);
    });
  });

  describe("TICK action", () => {
    it("decrements timeRemaining by 1", () => {
      const state = createTestState({ timeRemaining: 10 });
      const action: GameAction = { type: "TICK" };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(9);
    });

    it("does not decrement below 0", () => {
      const state = createTestState({ timeRemaining: 0 });
      const action: GameAction = { type: "TICK" };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(0);
    });

    it("does not change scores, card, choices, or display", () => {
      const state = createTestState({ successes: 3, fails: 1 });
      const action: GameAction = { type: "TICK" };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(3);
      expect(newState.fails).toBe(1);
      expect(newState.card).toEqual(state.card);
      expect(newState.choices).toEqual(state.choices);
      expect(newState.display).toBe(state.display);
    });
  });

  describe("RESET_TIMER action", () => {
    it("resets timeRemaining to the provided duration", () => {
      const state = createTestState({
        timeRemaining: 3,
        timerDuration: 15,
      });
      const action: GameAction = {
        type: "RESET_TIMER",
        payload: { duration: 20 },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(20);
    });

    it("updates timerDuration to the provided duration", () => {
      const state = createTestState({ timerDuration: 15 });
      const action: GameAction = {
        type: "RESET_TIMER",
        payload: { duration: 30 },
      };

      const newState = gameReducer(state, action);

      expect(newState.timerDuration).toBe(30);
    });

    it("does not change scores, card, choices, or display", () => {
      const state = createTestState({ successes: 2, fails: 1 });
      const action: GameAction = {
        type: "RESET_TIMER",
        payload: { duration: 20 },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(2);
      expect(newState.fails).toBe(1);
      expect(newState.card).toEqual(state.card);
      expect(newState.choices).toEqual(state.choices);
      expect(newState.display).toBe(state.display);
    });
  });

  describe("TIMEOUT action", () => {
    it("increments fails", () => {
      const state = createTestState({ fails: 2 });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(3);
    });

    it("does not change successes", () => {
      const state = createTestState({ successes: 5 });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(5);
    });

    it("advances to a new card with new choices and display", () => {
      const state = createTestState({ display: "index" });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.card).toEqual(newCard);
      expect(newState.choices).toEqual(newChoices);
      expect(newState.display).toBe("card");
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = createTestState({
        timeRemaining: 0,
        timerDuration: 15,
      });
      const { card: newCard, choices: newChoices } =
        generateNewCardAndChoices(testStack);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newCard, newChoices, newDisplay: "card" },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(15);
    });
  });

  describe("RESET_GAME action", () => {
    it("resets scores to zero", () => {
      const state = createTestState({ successes: 5, fails: 3 });
      const action: GameAction = {
        type: "RESET_GAME",
        payload: { stackOrder: testStack, timerDuration: 15 },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(0);
      expect(newState.fails).toBe(0);
    });

    it("generates a new card and choices from the provided stack", () => {
      const state = createTestState();
      const action: GameAction = {
        type: "RESET_GAME",
        payload: { stackOrder: testStack, timerDuration: 15 },
      };

      const newState = gameReducer(state, action);

      expect(newState.card).toBeDefined();
      expect(newState.card.index).toBeGreaterThanOrEqual(1);
      expect(newState.card.index).toBeLessThanOrEqual(52);
      expect(newState.choices).toHaveLength(5);

      for (const choice of newState.choices) {
        const cardInStack = testStack.some(
          (c) => c.suit === choice.card.suit && c.rank === choice.card.rank
        );
        expect(cardInStack).toBe(true);
      }
    });

    it("resets timeRemaining to the provided timerDuration", () => {
      const state = createTestState({ timeRemaining: 3, timerDuration: 15 });
      const action: GameAction = {
        type: "RESET_GAME",
        payload: { stackOrder: testStack, timerDuration: 30 },
      };

      const newState = gameReducer(state, action);

      expect(newState.timerDuration).toBe(30);
      expect(newState.timeRemaining).toBe(30);
    });

    it("resets display to card", () => {
      const state = createTestState({ display: "index" });
      const action: GameAction = {
        type: "RESET_GAME",
        payload: { stackOrder: testStack, timerDuration: 15 },
      };

      const newState = gameReducer(state, action);

      expect(newState.display).toBe("card");
    });
  });
});

describe("useFlashcardGame hook", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("revealAnswer()", () => {
    it("shows a notification with the card index when showing a card", async () => {
      const { notifications } = vi.mocked(
        await import("@mantine/notifications")
      );
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      // Default mode is "bothmodes", initial display is "card", so the answer is the index
      act(() => {
        result.current.revealAnswer();
      });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "yellow",
          message: expect.stringMatching(INDEX_ANSWER_PATTERN),
        })
      );
    });

    it("shows a notification with the card name when showing an index", async () => {
      const { notifications } = vi.mocked(
        await import("@mantine/notifications")
      );
      // Mock random to always return "index" display mode
      vi.spyOn(Math, "random").mockReturnValue(0.99);

      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      // Reveal once to advance past the initial "card" display
      act(() => {
        result.current.revealAnswer();
      });

      // Now display should be "index", so the answer is the card name
      const currentCard = result.current.card;
      act(() => {
        result.current.revealAnswer();
      });

      expect(notifications.show).toHaveBeenLastCalledWith(
        expect.objectContaining({
          color: "yellow",
          message: formatCardName(currentCard.card),
        })
      );
    });

    it("increments fails count", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      expect(result.current.score.fails).toBe(0);

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.score.fails).toBe(1);
    });

    it("advances to a new card", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      const cardBefore = result.current.card;

      let cardChanged = false;
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.revealAnswer();
        });
        if (
          result.current.card.index !== cardBefore.index ||
          result.current.card.card.suit !== cardBefore.card.suit
        ) {
          cardChanged = true;
          break;
        }
      }

      expect(cardChanged).toBe(true);
    });

    it("calls onAnswer with correct: false and questionAdvanced: true", () => {
      const onAnswer = vi.fn<(outcome: AnswerOutcome) => void>();
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica", { onAnswer })
      );

      act(() => {
        result.current.revealAnswer();
      });

      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: true,
      });
    });

    it("does not change successes count", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      expect(result.current.score.successes).toBe(0);

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.score.successes).toBe(0);
    });

    it("emits FLASHCARD_ANSWER event with correct: false", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      act(() => {
        result.current.revealAnswer();
      });

      expect(eventBus.emit.FLASHCARD_ANSWER).toHaveBeenCalledWith({
        correct: false,
        stackName: "Mnemonica",
      });
    });
  });

  describe("submitAnswer()", () => {
    it("emits FLASHCARD_ANSWER event with correct: true on correct answer", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      const correctCard = result.current.card.card;

      act(() => {
        result.current.submitAnswer(correctCard);
      });

      expect(eventBus.emit.FLASHCARD_ANSWER).toHaveBeenCalledWith({
        correct: true,
        stackName: "Mnemonica",
      });
    });

    it("emits FLASHCARD_ANSWER event with correct: false on wrong answer", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const { result } = renderHook(() =>
        useFlashcardGame(testStack, "Mnemonica")
      );

      const currentCard = result.current.card.card;
      const wrongChoice = result.current.choices.find(
        (c) =>
          c.card.suit !== currentCard.suit || c.card.rank !== currentCard.rank
      );
      if (!wrongChoice) {
        throw new Error("Expected at least one wrong choice");
      }

      act(() => {
        result.current.submitAnswer(wrongChoice.card);
      });

      expect(eventBus.emit.FLASHCARD_ANSWER).toHaveBeenCalledWith({
        correct: false,
        stackName: "Mnemonica",
      });
    });
  });

  describe("handleTimeout", () => {
    it("emits FLASHCARD_ANSWER event with correct: false on timeout", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const gameTimerMock = (await import(
        "../../hooks/use-game-timer"
      )) as typeof import("../../hooks/use-game-timer") & {
        __getCapturedOnTimeout: () => (() => void) | undefined;
      };

      renderHook(() => useFlashcardGame(testStack, "Mnemonica"));

      const onTimeout = gameTimerMock.__getCapturedOnTimeout();
      expect(onTimeout).toBeDefined();

      if (!onTimeout) {
        throw new Error("onTimeout should be defined after hook render");
      }

      act(() => {
        onTimeout();
      });

      expect(eventBus.emit.FLASHCARD_ANSWER).toHaveBeenCalledWith({
        correct: false,
        stackName: "Mnemonica",
      });
    });
  });
});
