import { describe, expect, it } from "vitest";
import { timerReducerCases } from "./use-game-timer";

describe("timerReducerCases", () => {
  describe("TICK", () => {
    it("decrements timeRemaining by 1", () => {
      const state = { timeRemaining: 10, other: "data" };
      const result = timerReducerCases.TICK(state);

      expect(result.timeRemaining).toBe(9);
      expect(result.other).toBe("data");
    });

    it("does not go below 0", () => {
      const state = { timeRemaining: 0 };
      const result = timerReducerCases.TICK(state);

      expect(result.timeRemaining).toBe(0);
    });

    it("handles timeRemaining of 1 correctly", () => {
      const state = { timeRemaining: 1 };
      const result = timerReducerCases.TICK(state);

      expect(result.timeRemaining).toBe(0);
    });

    it("preserves other state properties", () => {
      const state = {
        timeRemaining: 15,
        timerDuration: 30,
        score: 100,
        name: "test",
      };
      const result = timerReducerCases.TICK(state);

      expect(result).toEqual({
        timeRemaining: 14,
        timerDuration: 30,
        score: 100,
        name: "test",
      });
    });
  });

  describe("RESET_TIMER", () => {
    it("updates both timeRemaining and timerDuration", () => {
      const state = { timeRemaining: 5, timerDuration: 15, other: "data" };
      const result = timerReducerCases.RESET_TIMER(state, 30);

      expect(result.timeRemaining).toBe(30);
      expect(result.timerDuration).toBe(30);
      expect(result.other).toBe("data");
    });

    it("resets to a shorter duration", () => {
      const state = { timeRemaining: 20, timerDuration: 30 };
      const result = timerReducerCases.RESET_TIMER(state, 10);

      expect(result.timeRemaining).toBe(10);
      expect(result.timerDuration).toBe(10);
    });

    it("preserves other state properties", () => {
      const state = {
        timeRemaining: 5,
        timerDuration: 15,
        score: 100,
        name: "test",
      };
      const result = timerReducerCases.RESET_TIMER(state, 30);

      expect(result).toEqual({
        timeRemaining: 30,
        timerDuration: 30,
        score: 100,
        name: "test",
      });
    });
  });
});
