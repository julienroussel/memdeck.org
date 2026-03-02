import { describe, expect, it, vi } from "vitest";
import { createDeckPosition } from "../../types/stacks";
import { mnemonica } from "../../types/stacks/mnemonica";
import { FourOfClubs } from "../../types/suits/clubs";
import type { AcaanScenario } from "../../utils/acaan-scenario";
import {
  createInitialState,
  formatCutDepthMessage,
  type GameState,
  gameReducer,
  getCurrentCutDepth,
} from "./acaan-game-reducer";

const stackOrder = mnemonica.order;

const makeScenario = (
  cardPosition: number,
  targetPosition: number
): AcaanScenario => ({
  card: FourOfClubs,
  cardPosition: createDeckPosition(cardPosition),
  targetPosition: createDeckPosition(targetPosition),
});

const baseScenario = makeScenario(1, 5);

const makeState = (overrides: Partial<GameState> = {}): GameState => ({
  scenario: baseScenario,
  successes: 0,
  fails: 0,
  timeRemaining: 30,
  timerDuration: 30,
  ...overrides,
});

vi.mock("../../utils/acaan-scenario", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../utils/acaan-scenario")>();
  return {
    ...actual,
    generateAcaanScenario: vi.fn(() => baseScenario),
  };
});

describe("getCurrentCutDepth", () => {
  it("delegates to calculateCutDepth and returns 0 when card is at target position", () => {
    const scenario = makeScenario(10, 10);
    expect(getCurrentCutDepth(scenario)).toBe(0);
  });

  it("returns the correct cut depth when card is ahead of target", () => {
    // cardPosition=10, targetPosition=5 → (10 - 5 + 52) % 52 = 5
    const scenario = makeScenario(10, 5);
    expect(getCurrentCutDepth(scenario)).toBe(5);
  });

  it("returns the correct cut depth with wraparound when target is ahead of card", () => {
    // cardPosition=5, targetPosition=10 → (5 - 10 + 52) % 52 = 47
    const scenario = makeScenario(5, 10);
    expect(getCurrentCutDepth(scenario)).toBe(47);
  });

  it("returns a value in the valid range 0-51 for all positions", () => {
    for (let cardPos = 1; cardPos <= 52; cardPos++) {
      for (let targetPos = 1; targetPos <= 52; targetPos++) {
        const scenario = makeScenario(cardPos, targetPos);
        const depth = getCurrentCutDepth(scenario);
        expect(depth).toBeGreaterThanOrEqual(0);
        expect(depth).toBeLessThanOrEqual(51);
      }
    }
  });
});

describe("formatCutDepthMessage", () => {
  it("formats a standard message with non-zero cut depth", () => {
    const message = formatCutDepthMessage(
      createDeckPosition(10),
      createDeckPosition(5),
      5
    );
    expect(message).toBe("Position 10 → 5, cut depth: 5");
  });

  it("formats the special case message when cut depth is 0", () => {
    const message = formatCutDepthMessage(
      createDeckPosition(10),
      createDeckPosition(10),
      0
    );
    expect(message).toBe("Position 10 → 10, cut depth: 0 (no cut needed)");
  });

  it("includes both cardPosition and targetPosition in the message", () => {
    const message = formatCutDepthMessage(
      createDeckPosition(1),
      createDeckPosition(52),
      1
    );
    expect(message).toBe("Position 1 → 52, cut depth: 1");
  });

  it("formats message with large cut depth correctly", () => {
    const message = formatCutDepthMessage(
      createDeckPosition(52),
      createDeckPosition(1),
      51
    );
    expect(message).toBe("Position 52 → 1, cut depth: 51");
  });
});

describe("createInitialState", () => {
  it("returns state with zero successes and fails", () => {
    const state = createInitialState(stackOrder, 30);
    expect(state.successes).toBe(0);
    expect(state.fails).toBe(0);
  });

  it("sets timeRemaining equal to the provided timerDuration", () => {
    const state = createInitialState(stackOrder, 45);
    expect(state.timeRemaining).toBe(45);
    expect(state.timerDuration).toBe(45);
  });

  it("includes a scenario with card, cardPosition, and targetPosition", () => {
    const state = createInitialState(stackOrder, 30);
    expect(state.scenario).toHaveProperty("card");
    expect(state.scenario).toHaveProperty("cardPosition");
    expect(state.scenario).toHaveProperty("targetPosition");
  });

  it("timerDuration reflects the supplied duration value", () => {
    const state = createInitialState(stackOrder, 60);
    expect(state.timerDuration).toBe(60);
  });

  it("delegates scenario creation to generateAcaanScenario", () => {
    const state = createInitialState(stackOrder, 30);
    expect(state.scenario).toBe(baseScenario);
  });
});

describe("generateAcaanScenario variation (real implementation)", () => {
  // Intentionally probabilistic: with 52 possible card positions and 52 target
  // positions over 20 draws, the probability of all 20 being identical is
  // vanishingly small (~(1/2704)^19) — effectively zero.
  it("produces varying scenarios across multiple calls", async () => {
    const { generateAcaanScenario: realGenerate } = await vi.importActual<
      typeof import("../../utils/acaan-scenario")
    >("../../utils/acaan-scenario");
    const states = Array.from({ length: 20 }, () => realGenerate(stackOrder));
    const uniqueCards = new Set(
      states.map((s) => `${s.cardPosition}-${s.targetPosition}`)
    );
    expect(uniqueCards.size).toBeGreaterThan(1);
  });
});

describe("gameReducer", () => {
  const newScenario = makeScenario(3, 7);

  describe("CORRECT_ANSWER", () => {
    it("increments successes by 1", () => {
      const state = makeState({ successes: 2 });
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      });
      expect(next.successes).toBe(3);
    });

    it("does not change fails", () => {
      const state = makeState({ fails: 1 });
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      });
      expect(next.fails).toBe(1);
    });

    it("replaces the scenario with the new scenario from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      });
      expect(next.scenario).toBe(newScenario);
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = makeState({ timeRemaining: 5, timerDuration: 30 });
      const next = gameReducer(state, {
        type: "CORRECT_ANSWER",
        payload: { newScenario },
      });
      expect(next.timeRemaining).toBe(30);
    });
  });

  describe("WRONG_ANSWER", () => {
    it("increments fails by 1", () => {
      const state = makeState({ fails: 0 });
      const next = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(next.fails).toBe(1);
    });

    it("does not change successes", () => {
      const state = makeState({ successes: 3 });
      const next = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(next.successes).toBe(3);
    });

    it("does not reset the timer or advance to the next scenario", () => {
      const state = makeState({ timeRemaining: 10, scenario: baseScenario });
      const next = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(next.timeRemaining).toBe(10);
      expect(next.scenario).toBe(baseScenario);
    });

    it("accumulates fails across multiple wrong answers", () => {
      let state = makeState();
      state = gameReducer(state, { type: "WRONG_ANSWER" });
      state = gameReducer(state, { type: "WRONG_ANSWER" });
      state = gameReducer(state, { type: "WRONG_ANSWER" });
      expect(state.fails).toBe(3);
    });
  });

  describe("TIMEOUT", () => {
    it("increments fails by 1", () => {
      const state = makeState({ fails: 2 });
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: { newScenario },
      });
      expect(next.fails).toBe(3);
    });

    it("replaces the scenario with the new scenario from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: { newScenario },
      });
      expect(next.scenario).toBe(newScenario);
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = makeState({ timeRemaining: 0, timerDuration: 30 });
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: { newScenario },
      });
      expect(next.timeRemaining).toBe(30);
    });

    it("does not change successes", () => {
      const state = makeState({ successes: 5 });
      const next = gameReducer(state, {
        type: "TIMEOUT",
        payload: { newScenario },
      });
      expect(next.successes).toBe(5);
    });
  });

  describe("REVEAL_ANSWER", () => {
    it("increments fails by 1", () => {
      const state = makeState({ fails: 0 });
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: { newScenario },
      });
      expect(next.fails).toBe(1);
    });

    it("replaces the scenario with the new scenario from payload", () => {
      const state = makeState();
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: { newScenario },
      });
      expect(next.scenario).toBe(newScenario);
    });

    it("resets timeRemaining to timerDuration", () => {
      const state = makeState({ timeRemaining: 15, timerDuration: 30 });
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: { newScenario },
      });
      expect(next.timeRemaining).toBe(30);
    });

    it("does not change successes", () => {
      const state = makeState({ successes: 7 });
      const next = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: { newScenario },
      });
      expect(next.successes).toBe(7);
    });

    it("behaves identically to TIMEOUT (shared case)", () => {
      const state = makeState({ fails: 1, successes: 2, timeRemaining: 3 });
      const fromTimeout = gameReducer(state, {
        type: "TIMEOUT",
        payload: { newScenario },
      });
      const fromReveal = gameReducer(state, {
        type: "REVEAL_ANSWER",
        payload: { newScenario },
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

    it("does not change successes, fails, or scenario", () => {
      const state = makeState({ successes: 3, fails: 2, timeRemaining: 5 });
      const next = gameReducer(state, { type: "TICK" });
      expect(next.successes).toBe(3);
      expect(next.fails).toBe(2);
      expect(next.scenario).toBe(baseScenario);
    });

    it("decrements from 1 to 0", () => {
      const state = makeState({ timeRemaining: 1 });
      const next = gameReducer(state, { type: "TICK" });
      expect(next.timeRemaining).toBe(0);
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

    it("does not change successes, fails, or scenario", () => {
      const state = makeState({ successes: 4, fails: 1 });
      const next = gameReducer(state, {
        type: "RESET_TIMER",
        payload: { duration: 30 },
      });
      expect(next.successes).toBe(4);
      expect(next.fails).toBe(1);
      expect(next.scenario).toBe(baseScenario);
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

    it("resets timeRemaining to the provided timerDuration", () => {
      const state = makeState({ timeRemaining: 5 });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 60 },
      });
      expect(next.timeRemaining).toBe(60);
      expect(next.timerDuration).toBe(60);
    });

    it("sets a new scenario from the provided stack", () => {
      const state = makeState({ successes: 5 });
      const next = gameReducer(state, {
        type: "RESET_GAME",
        payload: { stackOrder, timerDuration: 30 },
      });
      expect(next.scenario).toHaveProperty("card");
      expect(next.scenario).toHaveProperty("cardPosition");
      expect(next.scenario).toHaveProperty("targetPosition");
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
    });
  });
});
