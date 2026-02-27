import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeckPosition } from "../../types/stacks";
import { mnemonica } from "../../types/stacks/mnemonica";
import type { AcaanScenario } from "../../utils/acaan-scenario";
import { calculateCutDepth } from "../../utils/acaan-scenario";
import {
  createInitialState,
  formatCutDepthMessage,
  type GameAction,
  type GameState,
  gameReducer,
  getCurrentCutDepth,
} from "./acaan-game-reducer";
import { useAcaanGame } from "./use-acaan-game";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("../../hooks/use-acaan-timer", () => ({
  useAcaanTimer: () => ({
    timerSettings: { enabled: false, duration: 15 },
    setTimerSettings: vi.fn(),
  }),
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
    emit: { ACAAN_ANSWER: vi.fn() },
  },
}));

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

describe("getCurrentCutDepth", () => {
  it("returns the cut depth for a standard scenario", () => {
    const scenario: AcaanScenario = {
      card: mnemonica.order[9],
      cardPosition: createDeckPosition(10),
      targetPosition: createDeckPosition(25),
    };

    expect(getCurrentCutDepth(scenario)).toBe(37);
  });

  it("returns 0 when card is already at the target position", () => {
    const scenario: AcaanScenario = {
      card: mnemonica.order[19],
      cardPosition: createDeckPosition(20),
      targetPosition: createDeckPosition(20),
    };

    expect(getCurrentCutDepth(scenario)).toBe(0);
  });

  it("returns the correct cut depth when cardPosition is greater than targetPosition", () => {
    const scenario: AcaanScenario = {
      card: mnemonica.order[24],
      cardPosition: createDeckPosition(25),
      targetPosition: createDeckPosition(10),
    };

    expect(getCurrentCutDepth(scenario)).toBe(15);
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

  describe("REVEAL_ANSWER action", () => {
    it("increments fails", () => {
      const state = createTestState({ fails: 1 });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "REVEAL_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.fails).toBe(2);
    });

    it("does not change successes", () => {
      const state = createTestState({ successes: 5 });
      const newScenario = createTestScenario(20, 15);
      const action: GameAction = {
        type: "REVEAL_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.successes).toBe(5);
    });

    it("advances to a new scenario", () => {
      const state = createTestState();
      const newScenario = createTestScenario(15, 10);
      const action: GameAction = {
        type: "REVEAL_ANSWER",
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
        type: "REVEAL_ANSWER",
        payload: { newScenario },
      };

      const newState = gameReducer(state, action);

      expect(newState.timeRemaining).toBe(30);
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

describe("useAcaanGame hook", () => {
  afterEach(() => vi.clearAllMocks());

  describe("revealAnswer", () => {
    it("shows a notification with the correct cut depth answer", async () => {
      const { notifications } = vi.mocked(
        await import("@mantine/notifications")
      );
      const { result } = renderHook(() =>
        useAcaanGame(mnemonica.order, "Mnemonica")
      );

      const { cardPosition, targetPosition } = result.current.scenario;
      const expectedCutDepth = calculateCutDepth(cardPosition, targetPosition);
      const expectedMessage = formatCutDepthMessage(
        cardPosition,
        targetPosition,
        expectedCutDepth
      );

      act(() => {
        result.current.revealAnswer();
      });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: "yellow",
          message: expectedMessage,
        })
      );
    });

    it("increments fails count", () => {
      const { result } = renderHook(() =>
        useAcaanGame(mnemonica.order, "Mnemonica")
      );

      expect(result.current.score.fails).toBe(0);

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.score.fails).toBe(1);
    });

    it("advances to a new scenario", () => {
      const { result } = renderHook(() =>
        useAcaanGame(mnemonica.order, "Mnemonica")
      );

      const originalScenario = result.current.scenario;

      act(() => {
        result.current.revealAnswer();
      });

      expect(result.current.scenario).not.toBe(originalScenario);
    });

    it("calls onAnswer callback with correct: false and questionAdvanced: true", () => {
      const onAnswer = vi.fn();
      const { result } = renderHook(() =>
        useAcaanGame(mnemonica.order, "Mnemonica", { onAnswer })
      );

      act(() => {
        result.current.revealAnswer();
      });

      expect(onAnswer).toHaveBeenCalledWith({
        correct: false,
        questionAdvanced: true,
      });
    });

    it("emits ACAAN_ANSWER event with correct: false", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const { result } = renderHook(() =>
        useAcaanGame(mnemonica.order, "Mnemonica")
      );

      act(() => {
        result.current.revealAnswer();
      });

      expect(eventBus.emit.ACAAN_ANSWER).toHaveBeenCalledWith({
        correct: false,
        stackName: "Mnemonica",
      });
    });
  });

  describe("submitAnswer", () => {
    it("emits ACAAN_ANSWER event with correct: true on correct answer", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const { result } = renderHook(() =>
        useAcaanGame(mnemonica.order, "Mnemonica")
      );

      const { cardPosition, targetPosition } = result.current.scenario;
      const correctAnswer = calculateCutDepth(cardPosition, targetPosition);

      act(() => {
        result.current.submitAnswer(correctAnswer);
      });

      expect(eventBus.emit.ACAAN_ANSWER).toHaveBeenCalledWith({
        correct: true,
        stackName: "Mnemonica",
      });
    });

    it("emits ACAAN_ANSWER event with correct: false on wrong answer", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const { result } = renderHook(() =>
        useAcaanGame(mnemonica.order, "Mnemonica")
      );

      const { cardPosition, targetPosition } = result.current.scenario;
      const correctAnswer = calculateCutDepth(cardPosition, targetPosition);
      const wrongAnswer = correctAnswer === 0 ? 1 : correctAnswer - 1;

      act(() => {
        result.current.submitAnswer(wrongAnswer);
      });

      expect(eventBus.emit.ACAAN_ANSWER).toHaveBeenCalledWith({
        correct: false,
        stackName: "Mnemonica",
      });
    });
  });

  describe("handleTimeout", () => {
    it("emits ACAAN_ANSWER event with correct: false on timeout", async () => {
      const { eventBus } = await import("../../services/event-bus");
      const gameTimerMock = (await import(
        "../../hooks/use-game-timer"
      )) as typeof import("../../hooks/use-game-timer") & {
        __getCapturedOnTimeout: () => (() => void) | undefined;
      };

      renderHook(() => useAcaanGame(mnemonica.order, "Mnemonica"));

      const onTimeout = gameTimerMock.__getCapturedOnTimeout();
      expect(onTimeout).toBeDefined();

      if (!onTimeout) {
        throw new Error("onTimeout should be defined after hook render");
      }

      act(() => {
        onTimeout();
      });

      expect(eventBus.emit.ACAAN_ANSWER).toHaveBeenCalledWith({
        correct: false,
        stackName: "Mnemonica",
      });
    });
  });
});
