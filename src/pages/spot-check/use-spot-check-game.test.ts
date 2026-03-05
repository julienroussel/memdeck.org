import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DECK_SIZE } from "../../constants";
import { stacks } from "../../types/stacks";
import { useSpotCheckGame } from "./use-spot-check-game";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

let capturedTimerOptions: {
  dispatch: (action: unknown) => void;
  createTimeoutAction: () => unknown;
  onTimeout?: () => void;
} | null = null;

vi.mock("../../hooks/use-game-timer", () => ({
  useGameTimer: vi.fn((options: typeof capturedTimerOptions) => {
    capturedTimerOptions = options;
  }),
}));

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: {
      SPOT_CHECK_ANSWER: vi.fn(),
    },
  },
}));

const testStack = stacks.mnemonica.order;
const testStackName = stacks.mnemonica.name;
const timerOff = { enabled: false, duration: 15 } as const;

afterEach(() => {
  capturedTimerOptions = null;
  vi.restoreAllMocks();
});

describe("useSpotCheckGame", () => {
  describe("initial state", () => {
    it("starts with zero score", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff)
      );
      expect(result.current.score).toEqual({ successes: 0, fails: 0 });
    });

    it("generates a missing puzzle with 51 cards", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff)
      );
      expect(result.current.puzzleCards).toHaveLength(DECK_SIZE - 1);
      expect(result.current.puzzleState.mode).toBe("missing");
    });

    it("generates a swapped puzzle with 52 cards", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "swapped", timerOff)
      );
      expect(result.current.puzzleCards).toHaveLength(DECK_SIZE);
      expect(result.current.puzzleState.mode).toBe("swapped");
    });

    it("generates a moved puzzle with 52 cards", () => {
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "moved", timerOff)
      );
      expect(result.current.puzzleCards).toHaveLength(DECK_SIZE);
      expect(result.current.puzzleState.mode).toBe("moved");
    });
  });

  describe("submitAnswer", () => {
    it("increments successes on correct answer for missing mode", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, {
          onAnswer,
        })
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
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, {
          onAnswer,
        })
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
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, {
          onAnswer,
        })
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
        wrongIndex++;
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
  });

  it("increments successes on correct answer for swapped mode", () => {
    const onAnswer = vi.fn();
    const { result } = renderHook(() =>
      useSpotCheckGame(testStack, testStackName, "swapped", timerOff, {
        onAnswer,
      })
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
      useSpotCheckGame(testStack, testStackName, "swapped", timerOff, {
        onAnswer,
      })
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
      wrongIndex++;
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
      useSpotCheckGame(testStack, testStackName, "moved", timerOff, {
        onAnswer,
      })
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
      useSpotCheckGame(testStack, testStackName, "moved", timerOff, {
        onAnswer,
      })
    );

    const ps = result.current.puzzleState;
    if (ps.mode !== "moved") {
      throw new Error("Expected moved mode");
    }

    const movedCard = ps.puzzle.movedCard;

    // Find a card that is NOT the moved card
    let wrongIndex = 0;
    let wrongCard = result.current.puzzleCards[wrongIndex];
    while (wrongCard === movedCard) {
      wrongIndex++;
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

  describe("revealAnswer", () => {
    it("increments fails and advances to new puzzle", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, {
          onAnswer,
        })
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
  });

  describe("mode changes", () => {
    it("resets game when mode changes", () => {
      const { result, rerender } = renderHook(
        ({ mode }: { mode: "missing" | "swapped" | "moved" }) =>
          useSpotCheckGame(testStack, testStackName, mode, timerOff),
        { initialProps: { mode: "missing" } }
      );

      // Score something first
      act(() => {
        result.current.revealAnswer();
      });
      expect(result.current.score.fails).toBe(1);

      // Change mode
      rerender({ mode: "swapped" as const });

      expect(result.current.score).toEqual({ successes: 0, fails: 0 });
      expect(result.current.puzzleState.mode).toBe("swapped");
    });
  });

  describe("timer integration", () => {
    it("increments fails and advances puzzle on timeout", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useSpotCheckGame(testStack, testStackName, "missing", timerOff, {
          onAnswer,
        })
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
