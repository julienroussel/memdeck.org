import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DECK_SIZE } from "../../constants";
import type { useGameTimer } from "../../hooks/use-game-timer";
import { DEFAULT_STACK_LIMITS } from "../../types/stack-limits";
import { type Stack, stacks } from "../../types/stacks";
import { useSpotCheckGame } from "./use-spot-check-game";

vi.mock("@mantine/notifications", () => ({
  notifications: { hide: vi.fn(), show: vi.fn() },
}));

let capturedTimerOptions: Parameters<typeof useGameTimer>[0] | null = null;

vi.mock("../../hooks/use-game-timer", async () => {
  const actual = await vi.importActual<
    typeof import("../../hooks/use-game-timer")
  >("../../hooks/use-game-timer");
  return {
    ...actual,
    useGameTimer: vi.fn((options: typeof capturedTimerOptions) => {
      capturedTimerOptions = options;
    }),
  };
});

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: {
      SPOT_CHECK_ANSWER: vi.fn(),
    },
  },
}));

const testStack = stacks.mnemonica.order;
const testStackName = stacks.mnemonica.name;
const timerOff = { duration: 15, enabled: false } as const;

afterEach(() => {
  capturedTimerOptions = null;
  vi.restoreAllMocks();
});

describe("useSpotCheckGame", () => {
  describe("initial state", () => {
    it("starts with zero score", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "missing",
          timerOff,
          DEFAULT_STACK_LIMITS
        )
      );
      expect(result.current.score).toEqual({ fails: 0, successes: 0 });
    });

    it("generates a missing puzzle with 51 cards", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "missing",
          timerOff,
          DEFAULT_STACK_LIMITS
        )
      );
      expect(result.current.puzzleCards).toHaveLength(DECK_SIZE - 1);
      expect(result.current.puzzleState.mode).toBe("missing");
    });

    it("generates a swapped puzzle with 52 cards", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "swapped",
          timerOff,
          DEFAULT_STACK_LIMITS
        )
      );
      expect(result.current.puzzleCards).toHaveLength(DECK_SIZE);
      expect(result.current.puzzleState.mode).toBe("swapped");
    });

    it("generates a moved puzzle with 52 cards", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "moved",
          timerOff,
          DEFAULT_STACK_LIMITS
        )
      );
      expect(result.current.puzzleCards).toHaveLength(DECK_SIZE);
      expect(result.current.puzzleState.mode).toBe("moved");
    });
  });

  describe("submitAnswer", () => {
    it("increments successes on correct answer for missing mode", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "missing",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const ps = result.current.puzzleState;
      if (ps.mode !== "missing") {
        throw new Error("Expected missing mode");
      }

      // Tap the card adjacent to the gap (the card before the gap)
      const gap = ps.puzzle.missingIndex;
      const len = ps.puzzle.cards.length;
      const correctIndex = (gap - 1 + len) % len;
      const correctCard = ps.puzzle.cards[correctIndex];

      if (!correctCard) {
        throw new Error("Expected card at correct index");
      }

      act(() => {
        result.current.submitAnswer(correctCard, correctIndex);
      });

      expect(result.current.score.successes).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: true,
        questionAdvanced: true,
      });
    });

    it("increments successes when tapping the card after the gap in missing mode", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "missing",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const ps = result.current.puzzleState;
      if (ps.mode !== "missing") {
        throw new Error("Expected missing mode");
      }

      // Tap the card after the gap (wrapping around)
      const gap = ps.puzzle.missingIndex;
      const len = ps.puzzle.cards.length;
      const afterIndex = gap % len;
      const afterCard = ps.puzzle.cards[afterIndex];

      if (!afterCard) {
        throw new Error("Expected card at after index");
      }

      act(() => {
        result.current.submitAnswer(afterCard, afterIndex);
      });

      expect(result.current.score.successes).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: true,
        questionAdvanced: true,
      });
    });

    it("increments fails on wrong answer", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "missing",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const ps = result.current.puzzleState;
      if (ps.mode !== "missing") {
        throw new Error("Expected missing mode");
      }

      // Find a card that is NOT adjacent to the gap
      const gap = ps.puzzle.missingIndex;
      const len = ps.puzzle.cards.length;
      const before = (gap - 1 + len) % len;
      const after = gap % len;
      let wrongIndex = 0;
      while (wrongIndex === before || wrongIndex === after) {
        wrongIndex += 1;
      }
      const wrongCard = ps.puzzle.cards[wrongIndex];

      if (!wrongCard) {
        throw new Error("Expected card at wrong index");
      }

      act(() => {
        result.current.submitAnswer(wrongCard, wrongIndex);
      });

      expect(result.current.score.fails).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: false,
      });
    });

    it("increments successes on correct answer for swapped mode", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "swapped",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const ps = result.current.puzzleState;
      if (ps.mode !== "swapped") {
        throw new Error("Expected swapped mode");
      }

      // Either swapped card is correct — find the card at indexA in the original stack
      const correctCard = testStack[ps.puzzle.indexA];
      if (!correctCard) {
        throw new Error("Expected card at indexA");
      }

      // Find this card's position in the puzzle array
      const puzzleIndex = result.current.puzzleCards.indexOf(correctCard);

      act(() => {
        result.current.submitAnswer(correctCard, puzzleIndex);
      });

      expect(result.current.score.successes).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: true,
        questionAdvanced: true,
      });
    });

    it("increments fails when tapping a non-swapped card in swapped mode", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "swapped",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const ps = result.current.puzzleState;
      if (ps.mode !== "swapped") {
        throw new Error("Expected swapped mode");
      }

      const swappedCardA = testStack[ps.puzzle.indexA];
      const swappedCardB = testStack[ps.puzzle.indexB];

      // Find a card that is NOT one of the swapped cards
      let wrongIndex = 0;
      let wrongCard = result.current.puzzleCards[wrongIndex];
      while (wrongCard === swappedCardA || wrongCard === swappedCardB) {
        wrongIndex += 1;
        wrongCard = result.current.puzzleCards[wrongIndex];
      }

      if (!wrongCard) {
        throw new Error("Expected a non-swapped card");
      }

      act(() => {
        result.current.submitAnswer(wrongCard, wrongIndex);
      });

      expect(result.current.score.fails).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: false,
      });
    });

    it("increments successes on correct answer for moved mode", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "moved",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const ps = result.current.puzzleState;
      if (ps.mode !== "moved") {
        throw new Error("Expected moved mode");
      }

      const correctCard = ps.puzzle.movedCard;
      const puzzleIndex = ps.puzzle.newIndex;

      act(() => {
        result.current.submitAnswer(correctCard, puzzleIndex);
      });

      expect(result.current.score.successes).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: true,
        questionAdvanced: true,
      });
    });

    it("increments fails when tapping a non-moved card in moved mode", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "moved",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const ps = result.current.puzzleState;
      if (ps.mode !== "moved") {
        throw new Error("Expected moved mode");
      }

      const { movedCard } = ps.puzzle;

      // Find a card that is NOT the moved card
      let wrongIndex = 0;
      let wrongCard = result.current.puzzleCards[wrongIndex];
      while (wrongCard === movedCard) {
        wrongIndex += 1;
        wrongCard = result.current.puzzleCards[wrongIndex];
      }

      if (!wrongCard) {
        throw new Error("Expected a non-moved card");
      }

      act(() => {
        result.current.submitAnswer(wrongCard, wrongIndex);
      });

      expect(result.current.score.fails).toBe(1);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: false,
      });
    });
  });

  describe("revealAnswer", () => {
    it("increments fails and advances to new puzzle", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "missing",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const initialPuzzle = result.current.puzzleState;

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.score.fails).toBe(1);
      expect(result.current.puzzleState).not.toBe(initialPuzzle);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: true,
      });
    });

    it("revealAnswer in 'swapped' mode increments fails and advances to a new puzzle", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "swapped",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const initialPuzzle = result.current.puzzleState;

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.score.fails).toBe(1);
      expect(result.current.score.successes).toBe(0);
      expect(result.current.puzzleState).not.toBe(initialPuzzle);
      expect(result.current.puzzleState.mode).toBe("swapped");
      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: true,
      });
    });

    it("revealAnswer in 'moved' mode increments fails and advances to a new puzzle", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "moved",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const initialPuzzle = result.current.puzzleState;

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.score.fails).toBe(1);
      expect(result.current.score.successes).toBe(0);
      expect(result.current.puzzleState).not.toBe(initialPuzzle);
      expect(result.current.puzzleState.mode).toBe("moved");
      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: true,
      });
    });
  });

  describe("mode changes", () => {
    it("resets game when mode changes", () => {
      const { result, rerender } = renderHook(
        ({ mode }: { mode: "missing" | "swapped" | "moved" }) =>
          useSpotCheckGame(
            testStack,
            testStackName,
            mode,
            timerOff,
            DEFAULT_STACK_LIMITS
          ),
        { initialProps: { mode: "missing" } }
      );

      // Score something first
      act(() => {
        result.current.revealAnswer();
      });
      expect(result.current.score.fails).toBe(1);

      // Change mode
      rerender({ mode: "swapped" as const });

      expect(result.current.score).toEqual({ fails: 0, successes: 0 });
      expect(result.current.puzzleState.mode).toBe("swapped");
    });
  });

  describe("when stack changes", () => {
    it("resets score and rebuilds puzzle from the new stack", () => {
      type Props = { stack: Stack; name: string };
      const initialProps: Props = { name: testStackName, stack: testStack };
      const { result, rerender } = renderHook(
        ({ stack, name }: Props) =>
          useSpotCheckGame(
            stack,
            name,
            "missing",
            timerOff,
            DEFAULT_STACK_LIMITS
          ),
        { initialProps }
      );

      act(() => {
        result.current.revealAnswer();
      });
      expect(result.current.score.fails).toBe(1);

      rerender({ name: stacks.aronson.name, stack: stacks.aronson.order });

      expect(result.current.score).toEqual({ fails: 0, successes: 0 });
      const ps = result.current.puzzleState;
      if (ps.mode !== "missing") {
        throw new Error("Expected missing mode after rerender");
      }
      // Positional invariant: puzzleCards must follow aronson's order with one
      // card removed at missingIndex. Cards are shared singletons across stacks,
      // so membership checks are vacuous; positional checks prove the new stack
      // is sourced.
      for (let i = 0; i < result.current.puzzleCards.length; i += 1) {
        const aronsonIndex = i < ps.puzzle.missingIndex ? i : i + 1;
        expect(result.current.puzzleCards[i]).toBe(
          stacks.aronson.order[aronsonIndex]
        );
      }
    });
  });

  describe("partial range", () => {
    it("generates a puzzle using only cards within the specified range", async () => {
      const { createDeckPosition } = await import("../../types/stacks");
      const limits = {
        end: createDeckPosition(10),
        start: createDeckPosition(1),
      };
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, limits)
      );

      const rangeCards = testStack.slice(0, 10);
      for (const card of result.current.puzzleCards) {
        expect(rangeCards).toContain(card);
      }
    });

    it("uses all 52 cards when range covers the full deck", async () => {
      const { createDeckPosition } = await import("../../types/stacks");
      const limits = {
        end: createDeckPosition(52),
        start: createDeckPosition(1),
      };
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, limits)
      );

      // Missing mode removes one card, so puzzle should have 51 cards
      expect(result.current.puzzleCards).toHaveLength(DECK_SIZE - 1);
    });

    it("constrains all puzzle cards to positions 5-10 of the stack", async () => {
      const { createDeckPosition } = await import("../../types/stacks");
      const limits = {
        end: createDeckPosition(10),
        start: createDeckPosition(5),
      };
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, limits)
      );

      const rangeCards = testStack.slice(4, 10);
      for (const card of result.current.puzzleCards) {
        expect(rangeCards).toContain(card);
      }
    });

    it("produces puzzle card count matching range size minus one for missing mode", async () => {
      const { createDeckPosition } = await import("../../types/stacks");
      const limits = {
        end: createDeckPosition(10),
        start: createDeckPosition(5),
      };
      const rangeSize = 10 - 5 + 1; // 6 cards in range

      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, limits)
      );

      // Missing mode removes one card from the range
      expect(result.current.puzzleCards).toHaveLength(rangeSize - 1);
    });

    it("resets game when limits change", async () => {
      const { createDeckPosition } = await import("../../types/stacks");
      const initialLimits = {
        end: createDeckPosition(10),
        start: createDeckPosition(1),
      };
      const newLimits = {
        end: createDeckPosition(30),
        start: createDeckPosition(20),
      };

      const { result, rerender } = renderHook(
        ({ limits }: { limits: typeof initialLimits }) =>
          useSpotCheckGame(
            testStack,
            testStackName,
            "missing",
            timerOff,
            limits
          ),
        { initialProps: { limits: initialLimits } }
      );

      // Score something first
      act(() => {
        result.current.revealAnswer();
      });
      expect(result.current.score.fails).toBe(1);

      // Change limits
      rerender({ limits: newLimits });

      expect(result.current.score).toEqual({ fails: 0, successes: 0 });
    });

    it("generates a fresh puzzle with cards in the new range after limits change", async () => {
      const { createDeckPosition } = await import("../../types/stacks");
      const initialLimits = {
        end: createDeckPosition(52),
        start: createDeckPosition(1),
      };
      const newLimits = {
        end: createDeckPosition(10),
        start: createDeckPosition(1),
      };

      const { result, rerender } = renderHook(
        ({ limits }: { limits: typeof initialLimits }) =>
          useSpotCheckGame(
            testStack,
            testStackName,
            "missing",
            timerOff,
            limits
          ),
        { initialProps: { limits: initialLimits } }
      );

      const initialPuzzle = result.current.puzzleState;

      // Change to a smaller range
      rerender({ limits: newLimits });

      // Puzzle state should be regenerated
      expect(result.current.puzzleState).not.toBe(initialPuzzle);

      // All puzzle cards must be within the new range (positions 1-10)
      const rangeCards = testStack.slice(0, 10);
      for (const card of result.current.puzzleCards) {
        expect(rangeCards).toContain(card);
      }
    });
  });

  describe("timer integration", () => {
    it("increments fails and advances puzzle on timeout", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(
          testStack,
          testStackName,
          "missing",
          timerOff,
          DEFAULT_STACK_LIMITS,
          {
            onAnswer,
          }
        )
      );

      const initialPuzzle = result.current.puzzleState;

      // Simulate timeout by dispatching the timeout action created by the hook
      act(() => {
        if (capturedTimerOptions) {
          const action = capturedTimerOptions.createTimeoutAction();
          capturedTimerOptions.dispatch(action);
          capturedTimerOptions.onTimeout?.();
        }
      });

      expect(result.current.score.fails).toBe(1);
      expect(result.current.puzzleState).not.toBe(initialPuzzle);
      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: true,
      });
    });
  });
});
