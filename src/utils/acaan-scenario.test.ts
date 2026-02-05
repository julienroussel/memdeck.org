import { describe, expect, it } from "vitest";
import { mnemonica } from "../types/stacks/mnemonica";
import {
  type AcaanScenario,
  calculateCutDepth,
  generateAcaanScenario,
  getRandomTargetPosition,
} from "./acaan-scenario";

describe("getRandomTargetPosition", () => {
  it("returns a position between 1 and 52", () => {
    for (let i = 0; i < 100; i++) {
      const position = getRandomTargetPosition(1);
      expect(position).toBeGreaterThanOrEqual(1);
      expect(position).toBeLessThanOrEqual(52);
    }
  });

  it("never returns the excluded position", () => {
    for (let excludePos = 1; excludePos <= 52; excludePos++) {
      for (let i = 0; i < 20; i++) {
        const position = getRandomTargetPosition(excludePos);
        expect(position).not.toBe(excludePos);
      }
    }
  });
});

describe("generateAcaanScenario", () => {
  it("returns a valid ACAAN scenario", () => {
    const scenario = generateAcaanScenario(mnemonica.order);

    expect(scenario).toHaveProperty("card");
    expect(scenario).toHaveProperty("cardPosition");
    expect(scenario).toHaveProperty("targetPosition");
  });

  it("returns a card from the stack", () => {
    const scenario = generateAcaanScenario(mnemonica.order);

    expect(scenario.card).toHaveProperty("suit");
    expect(scenario.card).toHaveProperty("rank");
    expect(scenario.card).toHaveProperty("image");
  });

  it("returns card position between 1 and 52", () => {
    for (let i = 0; i < 100; i++) {
      const scenario = generateAcaanScenario(mnemonica.order);
      expect(scenario.cardPosition).toBeGreaterThanOrEqual(1);
      expect(scenario.cardPosition).toBeLessThanOrEqual(52);
    }
  });

  it("returns target position between 1 and 52", () => {
    for (let i = 0; i < 100; i++) {
      const scenario = generateAcaanScenario(mnemonica.order);
      expect(scenario.targetPosition).toBeGreaterThanOrEqual(1);
      expect(scenario.targetPosition).toBeLessThanOrEqual(52);
    }
  });

  it("target position is always different from card position", () => {
    for (let i = 0; i < 100; i++) {
      const scenario = generateAcaanScenario(mnemonica.order);
      expect(scenario.targetPosition).not.toBe(scenario.cardPosition);
    }
  });

  it("card at cardPosition matches the returned card", () => {
    for (let i = 0; i < 100; i++) {
      const scenario = generateAcaanScenario(mnemonica.order);
      const cardAtPosition = mnemonica.order[scenario.cardPosition - 1];
      expect(scenario.card).toBe(cardAtPosition);
    }
  });

  it("generates different scenarios on multiple calls (not always the same)", () => {
    const scenarios: AcaanScenario[] = [];
    for (let i = 0; i < 50; i++) {
      scenarios.push(generateAcaanScenario(mnemonica.order));
    }

    const uniqueCardPositions = new Set(scenarios.map((s) => s.cardPosition));
    const uniqueTargetPositions = new Set(
      scenarios.map((s) => s.targetPosition)
    );

    expect(uniqueCardPositions.size).toBeGreaterThan(1);
    expect(uniqueTargetPositions.size).toBeGreaterThan(1);
  });
});

describe("calculateCutDepth", () => {
  it("returns 0 when card is already at target position", () => {
    expect(calculateCutDepth(1, 1)).toBe(0);
    expect(calculateCutDepth(26, 26)).toBe(0);
    expect(calculateCutDepth(52, 52)).toBe(0);
  });

  it("calculates correct cut depth when card is ahead of target (no wraparound)", () => {
    // Card at position 10, target is position 5 -> cut 5 cards
    expect(calculateCutDepth(10, 5)).toBe(5);
    // Card at position 52, target is position 1 -> cut 51 cards
    expect(calculateCutDepth(52, 1)).toBe(51);
    // Card at position 30, target is position 20 -> cut 10 cards
    expect(calculateCutDepth(30, 20)).toBe(10);
  });

  it("calculates correct cut depth with wraparound (target ahead of card)", () => {
    // Card at position 5, target is position 10 -> wraparound cut
    // Formula: (5 - 10 + 52) % 52 = 47
    expect(calculateCutDepth(5, 10)).toBe(47);
    // Card at position 1, target is position 52 -> cut 1 card
    // Formula: (1 - 52 + 52) % 52 = 1
    expect(calculateCutDepth(1, 52)).toBe(1);
    // Card at position 20, target is position 30 -> cut 42 cards
    // Formula: (20 - 30 + 52) % 52 = 42
    expect(calculateCutDepth(20, 30)).toBe(42);
  });

  it("handles edge cases at deck boundaries", () => {
    // Card at position 1, target is position 2 -> wraparound, cut 51 cards
    expect(calculateCutDepth(1, 2)).toBe(51);
    // Card at position 2, target is position 1 -> cut 1 card
    expect(calculateCutDepth(2, 1)).toBe(1);
    // Card at position 51, target is position 52 -> wraparound, cut 51 cards
    expect(calculateCutDepth(51, 52)).toBe(51);
    // Card at position 52, target is position 51 -> cut 1 card
    expect(calculateCutDepth(52, 51)).toBe(1);
  });

  it("returns values in valid range (0-51)", () => {
    for (let cardPos = 1; cardPos <= 52; cardPos++) {
      for (let targetPos = 1; targetPos <= 52; targetPos++) {
        const cutDepth = calculateCutDepth(cardPos, targetPos);
        expect(cutDepth).toBeGreaterThanOrEqual(0);
        expect(cutDepth).toBeLessThanOrEqual(51);
      }
    }
  });
});
