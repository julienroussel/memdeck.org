import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnswerOutcome } from "../../types/session";
import { stacks } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import { formatCardName } from "../../utils/card-formatting";
import { useFlashcardGame } from "./use-flashcard-game";

const INDEX_ANSWER_PATTERN = /^\d+$/;

const defaultTimerSettings: TimerSettings = { enabled: false, duration: 15 };

// --- Mocks for hook-level tests ---

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
      );

      expect(result.current.score.fails).toBe(0);

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.score.fails).toBe(1);
    });

    it("advances to a new card", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings,
          { onAnswer }
        )
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
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
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
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

    it("treats a correct number answer as correct in numberonly mode", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "numberonly",
          "random",
          defaultTimerSettings
        )
      );

      const correctIndex = result.current.card.index;
      expect(result.current.score.successes).toBe(0);

      act(() => {
        result.current.submitAnswer(correctIndex);
      });

      expect(result.current.score.successes).toBe(1);
    });

    it("accumulates successes across multiple correct answers", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "cardonly",
          "random",
          defaultTimerSettings
        )
      );

      expect(result.current.score.successes).toBe(0);

      for (let i = 1; i <= 3; i++) {
        const correctCard = result.current.card.card;
        act(() => {
          result.current.submitAnswer(correctCard);
        });
        expect(result.current.score.successes).toBe(i);
      }
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

      renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
      );

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

  describe("shouldShowCard", () => {
    it("returns true when mode is cardonly", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "cardonly",
          "random",
          defaultTimerSettings
        )
      );

      expect(result.current.shouldShowCard).toBe(true);
    });

    it("returns false when mode is numberonly", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "numberonly",
          "random",
          defaultTimerSettings
        )
      );

      expect(result.current.shouldShowCard).toBe(false);
    });

    it("returns true when mode is bothmodes and display is card", () => {
      // Initial display is always "card" from createInitialState
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
      );

      expect(result.current.shouldShowCard).toBe(true);
    });

    it("returns false when mode is bothmodes and display is index", () => {
      // Force Math.random to return 0.99 so getRandomDisplayMode picks "index"
      vi.spyOn(Math, "random").mockReturnValue(0.99);

      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "bothmodes",
          "random",
          defaultTimerSettings
        )
      );

      // Initial display is "card"; advance to get a new display mode
      const correctCard = result.current.card.card;
      act(() => {
        result.current.submitAnswer(correctCard);
      });

      // After advancing, display should be "index" because Math.random returns 0.99
      expect(result.current.shouldShowCard).toBe(false);
    });
  });

  describe("neighbor mode", () => {
    it("sets isNeighborMode to true when mode is 'neighbor'", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "neighbor",
          "before",
          defaultTimerSettings
        )
      );

      expect(result.current.isNeighborMode).toBe(true);
    });

    it("sets isNeighborMode to false for non-neighbor modes", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "cardonly",
          "before",
          defaultTimerSettings
        )
      );

      expect(result.current.isNeighborMode).toBe(false);
    });

    it("returns a non-null resolvedDirection in neighbor mode", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "neighbor",
          "before",
          defaultTimerSettings
        )
      );

      expect(result.current.resolvedDirection).not.toBeNull();
      expect(["before", "after"]).toContain(result.current.resolvedDirection);
    });

    it("returns shouldShowCard as true in neighbor mode", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "neighbor",
          "after",
          defaultTimerSettings
        )
      );

      expect(result.current.shouldShowCard).toBe(true);
    });

    it("increments successes when submitting the correct neighbor card", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "neighbor",
          "before",
          defaultTimerSettings
        )
      );

      const questionCard = result.current.card;
      const direction = result.current.resolvedDirection;
      expect(direction).not.toBeNull();

      // Compute the expected neighbor index
      let expectedIndex: number;
      if (direction === "before") {
        expectedIndex = questionCard.index === 1 ? 52 : questionCard.index - 1;
      } else {
        expectedIndex = questionCard.index === 52 ? 1 : questionCard.index + 1;
      }

      // Find the answer card in the choices
      const answerChoice = result.current.choices.find(
        (c) => c.index === expectedIndex
      );
      expect(answerChoice).toBeDefined();

      // The answer card should differ from the question card
      expect(answerChoice?.index).not.toBe(questionCard.index);

      expect(result.current.score.successes).toBe(0);

      act(() => {
        if (answerChoice) {
          result.current.submitAnswer(answerChoice.card);
        }
      });

      expect(result.current.score.successes).toBe(1);
    });

    it("increments fails and does not advance on wrong answer in neighbor mode", () => {
      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "neighbor",
          "before",
          defaultTimerSettings
        )
      );

      const questionCard = result.current.card;
      const direction = result.current.resolvedDirection;
      expect(direction).not.toBeNull();

      // Compute the expected neighbor index to find a wrong choice
      let expectedIndex: number;
      if (direction === "before") {
        expectedIndex = questionCard.index === 1 ? 52 : questionCard.index - 1;
      } else {
        expectedIndex = questionCard.index === 52 ? 1 : questionCard.index + 1;
      }

      // Find a wrong choice (not the correct neighbor)
      const wrongChoice = result.current.choices.find(
        (c) => c.index !== expectedIndex
      );
      expect(wrongChoice).toBeDefined();

      const choicesBefore = result.current.choices;
      expect(result.current.score.fails).toBe(0);

      act(() => {
        if (wrongChoice) {
          result.current.submitAnswer(wrongChoice.card);
        }
      });

      expect(result.current.score.fails).toBe(1);
      expect(result.current.card).toEqual(questionCard);
      expect(result.current.choices).toEqual(choicesBefore);
    });

    it("shows a notification with the card name when revealing answer in neighbor mode", async () => {
      const { notifications } = vi.mocked(
        await import("@mantine/notifications")
      );

      const { result } = renderHook(() =>
        useFlashcardGame(
          testStack,
          "Mnemonica",
          "neighbor",
          "before",
          defaultTimerSettings
        )
      );

      act(() => {
        result.current.revealAnswer();
      });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "yellow",
          // In neighbor mode, the reveal message should be a card name (not a number)
          message: expect.not.stringMatching(INDEX_ANSWER_PATTERN),
        })
      );
    });
  });
});
