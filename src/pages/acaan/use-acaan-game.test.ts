import { describe, expect, it } from "vitest";
import { createDeckPosition } from "../../types/stacks";
import { mnemonica } from "../../types/stacks/mnemonica";
import type { AcaanScenario } from "../../utils/acaan-scenario";
import {
  createInitialState,
  formatCutDepthMessage,
  type GameAction,
  type GameState,
  gameReducer,
} from "./use-acaan-game";

// Helper to create a test scenario
const createTestScenario = (
  cardPosition: number,
  targetPosition: number
): AcaanScenario => ({
  card: mnemonica.order[cardPosition - 1],
  cardPosition: createDeckPosition(cardPosition),
  targetPosition: createDeckPosition(targetPosition),
});

// Helper to create a test state
const createTestState = (overrides: Partial<GameState> = {}): GameState => ({
  scenario: createTestScenario(10, 5),
  successes: 0,
  fails: 0,
  timeRemaining: 15,
  timerDuration: 15,
  ...overrides,
});

describe("formatCutDepthMessage", () => {
  it("formats message with non-zero cut depth", () => {
    const message = formatCutDepthMessage(10, 5, 5);
    expect(message).toBe("Position 10 → 5, cut depth: 5");
  });

  it("formats message with large cut depth", () => {
    const message = formatCutDepthMessage(5, 10, 47);
    expect(message).toBe("Position 5 → 10, cut depth: 47");
  });

  it("formats message with special text when cut depth is zero", () => {
    const message = formatCutDepthMessage(10, 10, 0);
    expect(message).toBe("Position 10 → 10, cut depth: 0 (no cut needed)");
  });

  it("formats message for edge positions", () => {
    const message = formatCutDepthMessage(1, 52, 1);
    expect(message).toBe("Position 1 → 52, cut depth: 1");
  });
});

describe("createInitialState", () => {
  it("creates state with initial scenario from stack", () => {
    const state = createInitialState(mnemonica.order, 15);

    expect(state.scenario).toBeDefined();
    expect(state.scenario.card).toBeDefined();
    expect(state.scenario.cardPosition).toBeGreaterThanOrEqual(1);
    expect(state.scenario.cardPosition).toBeLessThanOrEqual(52);
    expect(state.scenario.targetPosition).toBeGreaterThanOrEqual(1);
    expect(state.scenario.targetPosition).toBeLessThanOrEqual(52);
  });

  it("creates state with zero scores", () => {
    const state = createInitialState(mnemonica.order, 15);

    expect(state.successes).toBe(0);
    expect(state.fails).toBe(0);
  });

  it("creates state with provided timer duration", () => {
    const state = createInitialState(mnemonica.order, 30);

    expect(state.timerDuration).toBe(30);
    expect(state.timeRemaining).toBe(30);
  });

  it("sets timeRemaining equal to timerDuration", () => {
    const state = createInitialState(mnemonica.order, 10);

    expect(state.timeRemaining).toBe(state.timerDuration);
  });
});

describe("gameReducer", () => {
  describe("CORRECT_ANSWER action", () => {
    it("increments successes", () => {
      const state = createTestState({ successes: 2 });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(3);
    });

    it("does not change fails", () => {
      const state = createTestState({ fails: 1 });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(1);
    });

    it("updates scenario to new scenario", () => {
      const state = createTestState();
      const newScenario = createTestScenario(30, 25);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.scenario).toEqual(newScenario);
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = createTestState({
        timeRemaining: 5,
        timerDuration: 15,
      });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(15);
    });
  });

  describe("WRONG_ANSWER action", () => {
    it("increments fails", () => {
      const state = createTestState({ fails: 3 });
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(4);
    });

    it("does not change successes", () => {
      const state = createTestState({ successes: 2 });
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(2);
    });

    it("does not advance to a new scenario", () => {
      const state = createTestState();
      const originalScenario = state.scenario;
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.scenario).toEqual(originalScenario);
    });

    it("does not reset timeRemaining", () => {
      const state = createTestState({
        timeRemaining: 3,
        timerDuration: 10,
      });
      const action: GameAction = { type: "WRONG_ANSWER" };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(3);
    });
  });

  describe("TIMEOUT action", () => {
    it("increments fails", () => {
      const state = createTestState({ fails: 1 });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(2);
    });

    it("does not change successes", () => {
      const state = createTestState({ successes: 5 });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(5);
    });

    it("updates scenario to new scenario", () => {
      const state = createTestState();
      const newScenario = createTestScenario(15, 10);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.scenario).toEqual(newScenario);
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = createTestState({
        timeRemaining: 0,
        timerDuration: 30,
      });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "TIMEOUT",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(30);
    });
  });

  describe("TICK action", () => {
    it("decrements timeRemaining by 1", () => {
      const state = createTestState({ timeRemaining: 10 });
      const action: GameAction = { type: "TICK" };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(9);
    });

    it("does not go below 0", () => {
      const state = createTestState({ timeRemaining: 0 });
      const action: GameAction = { type: "TICK" };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(0);
    });

    it("does not change other state properties", () => {
      const state = createTestState({
        successes: 3,
        fails: 2,
        timerDuration: 15,
      });
      const action: GameAction = { type: "TICK" };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(3);
      expect(newState.fails).toBe(2);
      expect(newState.timerDuration).toBe(15);
      expect(newState.scenario).toEqual(state.scenario);
    });
  });

  describe("RESET_TIMER action", () => {
    it("updates timerDuration to new value", () => {
      const state = createTestState({ timerDuration: 15 });
      const action: GameAction = {
        type: "RESET_TIMER",
        payload: { duration: 30 },
      };

      const newState = gameReducer(state, action);

      expect(newState.timerDuration).toBe(30);
    });

    it("updates timeRemaining to new duration", () => {
      const state = createTestState({ timeRemaining: 5 });
      const action: GameAction = {
        type: "RESET_TIMER",
        payload: { duration: 10 },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(10);
    });

    it("does not change scores", () => {
      const state = createTestState({ successes: 4, fails: 2 });
      const action: GameAction = {
        type: "RESET_TIMER",
        payload: { duration: 30 },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(4);
      expect(newState.fails).toBe(2);
    });

    it("does not change scenario", () => {
      const state = createTestState();
      const originalScenario = state.scenario;
      const action: GameAction = {
        type: "RESET_TIMER",
        payload: { duration: 30 },
      };

      const newState = gameReducer(state, action);

      expect(newState.scenario).toEqual(originalScenario);
    });
  });

  describe("RESET_GAME action", () => {
    it("resets scores to zero", () => {
      const state = createTestState({ successes: 5, fails: 3 });
      const action: GameAction = {
        type: "RESET_GAME",
        payload: { stackOrder: mnemonica.order, timerDuration: 15 },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(0);
      expect(newState.fails).toBe(0);
    });

    it("generates a new scenario from the provided stack", () => {
      const state = createTestState();
      const action: GameAction = {
        type: "RESET_GAME",
        payload: { stackOrder: mnemonica.order, timerDuration: 15 },
      };

      const newState = gameReducer(state, action);

      expect(newState.scenario).toBeDefined();
      expect(newState.scenario.card).toBeDefined();
      expect(newState.scenario.cardPosition).toBeGreaterThanOrEqual(1);
      expect(newState.scenario.cardPosition).toBeLessThanOrEqual(52);
    });

    it("resets timeRemaining to the provided timerDuration", () => {
      const state = createTestState({ timeRemaining: 3, timerDuration: 15 });
      const action: GameAction = {
        type: "RESET_GAME",
        payload: { stackOrder: mnemonica.order, timerDuration: 30 },
      };

      const newState = gameReducer(state, action);

      expect(newState.timerDuration).toBe(30);
      expect(newState.timeRemaining).toBe(30);
    });
  });

  describe("state immutability", () => {
    it("returns a new object for CORRECT_ANSWER", () => {
      const state = createTestState();
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState).not.toBe(state);
    });

    it("returns a new object for TICK", () => {
      const state = createTestState();
      const action: GameAction = { type: "TICK" };

      const newState = gameReducer(state, action);

      expect(newState).not.toBe(state);
    });
  });
});
