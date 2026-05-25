import { describe, expect, it } from "vitest";
import { DECK_SIZE } from "../../constants";
import type { PlayingCard } from "../../types/playingcard";
import type { SpotCheckMode } from "../../types/spot-check";
import { createDeckPosition, type DeckPosition } from "../../types/stacks";
import { mnemonica } from "../../types/stacks/mnemonica";
import {
  createInitialState,
  type GameAction,
  type GameState,
  gameReducer,
  generatePuzzle,
  getCardsForPuzzle,
} from "./spot-check-game-reducer";
import type { PuzzleState } from "./utils";

const FULL_LIMITS = {
  start: createDeckPosition(1),
  end: createDeckPosition(DECK_SIZE),
};

const UNHANDLED_ACTION_RE = /Unhandled action type/;
const UNKNOWN_SPOT_CHECK_MODE_RE = /Unknown spot check mode/;

const stackOrder = mnemonica.order;

const sampleCards: readonly PlayingCard[] = stackOrder.slice(0, 10);

const samplePuzzleState = (): PuzzleState =>
  generatePuzzle(sampleCards, "missing");

const baseState = (overrides?: Partial<GameState>): GameState => ({
  successes: 2,
  fails: 1,
  puzzleState: samplePuzzleState(),
  timeRemaining: 7,
  timerDuration: 15,
  ...overrides,
});

describe("gameReducer", () => {
  describe("CORRECT_ANSWER", () => {
    it("increments successes, swaps the puzzle, and resets timeRemaining to timerDuration", () => {
      const state = baseState({ timeRemaining: 3, timerDuration: 15 });
      const newPuzzle = generatePuzzle(sampleCards, "swapped");

      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: { newPuzzle },
      });

      expect(next.successes).toBe(state.successes + 1);
      expect(next.fails).toBe(state.fails);
      expect(next.puzzleState).toBe(newPuzzle);
      expect(next.timeRemaining).toBe(15);
      expect(next.timerDuration).toBe(15);
    });
  });

  describe("WRONG_ANSWER", () => {
    it("increments fails without swapping the puzzle or resetting the timer", () => {
      // Regression guard: WRONG_ANSWER must NOT reset timeRemaining — that
      // behaviour belongs to REVEAL_ANSWER / TIMEOUT only.
      const state = baseState({ timeRemaining: 3, timerDuration: 15 });

      const next = gameReducer(state, { type: "WRONG_ANSWER" });

      expect(next.fails).toBe(state.fails + 1);
      expect(next.successes).toBe(state.successes);
      expect(next.puzzleState).toBe(state.puzzleState);
      expect(next.timeRemaining).toBe(3);
    });
  });

  describe("REVEAL_ANSWER", () => {
    it("increments fails, swaps the puzzle, and resets timeRemaining to timerDuration", () => {
      const state = baseState({ timeRemaining: 2, timerDuration: 15 });
      const newPuzzle = generatePuzzle(sampleCards, "moved");

      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: { newPuzzle },
      });

      expect(next.fails).toBe(state.fails + 1);
      expect(next.successes).toBe(state.successes);
      expect(next.puzzleState).toBe(newPuzzle);
      expect(next.timeRemaining).toBe(15);
    });
  });

  describe("TIMEOUT", () => {
    it("increments fails, swaps the puzzle, and resets timeRemaining to timerDuration", () => {
      const state = baseState({ timeRemaining: 0, timerDuration: 30 });
      const newPuzzle = generatePuzzle(sampleCards, "swapped");

      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: { newPuzzle },
      });

      expect(next.fails).toBe(state.fails + 1);
      expect(next.successes).toBe(state.successes);
      expect(next.puzzleState).toBe(newPuzzle);
      expect(next.timeRemaining).toBe(30);
    });
  });

  describe("TICK", () => {
    it("decrements timeRemaining by 1 on TICK", () => {
      const state = baseState({ timeRemaining: 5 });

      const next = gameReducer(state, { type: "TICK" });

      expect(next.timeRemaining).toBe(4);
      expect(next.successes).toBe(state.successes);
      expect(next.fails).toBe(state.fails);
      expect(next.puzzleState).toBe(state.puzzleState);
    });
  });

  describe("RESET_TIMER", () => {
    it("resets timeRemaining and timerDuration to the new duration on RESET_TIMER", () => {
      const state = baseState({ timeRemaining: 4, timerDuration: 10 });

      const next = gameReducer(state, {
        type: "RESET_TIMER",
        payload: { duration: 30 },
      });

      expect(next.timeRemaining).toBe(30);
      expect(next.timerDuration).toBe(30);
    });
  });

  describe("RESET_GAME", () => {
    it("returns a fresh state via createInitialState", () => {
      const state = baseState({ successes: 9, fails: 4 });

      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: {
          cards: sampleCards,
          timerDuration: 20,
          spotCheckMode: "missing",
        },
      });

      expect(next.successes).toBe(0);
      expect(next.fails).toBe(0);
      expect(next.timeRemaining).toBe(20);
      expect(next.timerDuration).toBe(20);
      expect(next.puzzleState.mode).toBe("missing");
    });
  });

  describe("default branch", () => {
    it("throws on an unhandled action type", () => {
      // Test-only escape: the reducer's exhaustive switch makes it impossible
      // to construct an off-union action through the regular `GameAction`
      // type. Casting via `unknown` is the documented CLAUDE.md exception
      // for exercising default branches of discriminated-union switches.
      const bogusAction = { type: "UNKNOWN_ACTION" } as unknown as GameAction;

      expect(() => gameReducer(baseState(), bogusAction)).toThrow(
        UNHANDLED_ACTION_RE
      );
    });
  });
});

describe("generatePuzzle", () => {
  it("returns a PuzzleState with mode 'missing' for the missing variant", () => {
    const puzzle = generatePuzzle(sampleCards, "missing");

    expect(puzzle.mode).toBe("missing");
  });

  it("returns a PuzzleState with mode 'swapped' for the swapped variant", () => {
    const puzzle = generatePuzzle(sampleCards, "swapped");

    expect(puzzle.mode).toBe("swapped");
  });

  it("returns a PuzzleState with mode 'moved' for the moved variant", () => {
    const puzzle = generatePuzzle(sampleCards, "moved");

    expect(puzzle.mode).toBe("moved");
  });

  it("throws on an unknown spot check mode", () => {
    // Test-only escape: the function's exhaustive switch makes it impossible
    // to pass an off-union mode through `SpotCheckMode`. Casting via
    // `unknown` is the documented CLAUDE.md exception for exercising the
    // default branch of a discriminated-union switch.
    const bogusMode = "shuffled" as unknown as SpotCheckMode;

    expect(() => generatePuzzle(sampleCards, bogusMode)).toThrow(
      UNKNOWN_SPOT_CHECK_MODE_RE
    );
  });
});

describe("getCardsForPuzzle", () => {
  it("returns the full stackOrder reference when limits cover the full deck", () => {
    const result = getCardsForPuzzle(stackOrder, FULL_LIMITS);

    expect(result).toBe(stackOrder);
  });

  it("returns a slice from start-1 to end (inclusive) otherwise", () => {
    const limits = {
      start: createDeckPosition(5),
      end: createDeckPosition(10),
    };

    const result = getCardsForPuzzle(stackOrder, limits);

    expect(result).toHaveLength(6);
    expect(result[0]).toBe(stackOrder[4]);
    expect(result.at(-1)).toBe(stackOrder[9]);
  });

  it("returns a single-card slice when start equals end", () => {
    const position: DeckPosition = createDeckPosition(3);
    const limits = { start: position, end: position };

    const result = getCardsForPuzzle(stackOrder, limits);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(stackOrder[2]);
  });
});

describe("createInitialState", () => {
  it("sets successes and fails to 0, mirrors timerDuration into timeRemaining, and generates a puzzle for the requested mode", () => {
    const state = createInitialState(sampleCards, 15, "swapped");

    expect(state.successes).toBe(0);
    expect(state.fails).toBe(0);
    expect(state.timerDuration).toBe(15);
    expect(state.timeRemaining).toBe(15);
    expect(state.puzzleState.mode).toBe("swapped");
  });

  it("passes the timerDuration through unchanged for the 'moved' mode", () => {
    const state = createInitialState(sampleCards, 30, "moved");

    expect(state.timerDuration).toBe(30);
    expect(state.timeRemaining).toBe(30);
    expect(state.puzzleState.mode).toBe("moved");
  });
});
