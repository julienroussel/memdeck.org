import { describe, expect, it } from "vitest";
import { DEFAULT_STACK_LIMITS } from "../../types/stack-limits";
import {
  createDeckPosition,
  type PlayingCardPosition,
} from "../../types/stacks";
import { mnemonica } from "../../types/stacks/mnemonica";
import { FourOfClubs } from "../../types/suits/clubs";
import { TwoOfHearts } from "../../types/suits/hearts";
import {
  createInitialState,
  type DistanceRound,
  type GameState,
  gameReducer,
  generateApplyPrompt,
  generateComputePrompt,
  generateNextDistanceRound,
  isCorrectAnswer,
} from "./distance-game-reducer";

const stackOrder = mnemonica.order;
const FULL = DEFAULT_STACK_LIMITS;

const cardAtPos = (
  card: PlayingCardPosition["card"],
  index: number
): PlayingCardPosition => ({ card, index: createDeckPosition(index) });

const cardAtPos1 = cardAtPos(FourOfClubs, 1);
const cardAtPos2 = cardAtPos(TwoOfHearts, 2);

const computeRound = (
  expectedDistance: number,
  answerCard: PlayingCardPosition = cardAtPos2,
  data: number[] = [1, 2, 3, 4, 5]
): Extract<DistanceRound, { display: "compute" }> => ({
  answerCard,
  choices: { data, kind: "numbers" },
  display: "compute",
  expectedDistance,
  offset: null,
});

const applyRound = (
  offset: number,
  answerCard: PlayingCardPosition = cardAtPos2
): Extract<DistanceRound, { display: "apply" }> => ({
  answerCard,
  choices: {
    data: [cardAtPos1, cardAtPos2],
    kind: "cards",
  },
  display: "apply",
  expectedDistance: null,
  offset,
});

type BaseStateOverrides = {
  successes?: number;
  fails?: number;
  timeRemaining?: number;
  timerDuration?: number;
};

const baseState = (overrides: BaseStateOverrides = {}): GameState => ({
  card: cardAtPos1,
  fails: overrides.fails ?? 0,
  successes: overrides.successes ?? 0,
  ...computeRound(1),
  convention: "cyclic",
  timeRemaining: overrides.timeRemaining ?? 30,
  timerDuration: overrides.timerDuration ?? 30,
});

describe("generateComputePrompt", () => {
  it("returns prompt and answer cards that differ", () => {
    for (let i = 0; i < 50; i += 1) {
      const round = generateComputePrompt(stackOrder, "cyclic", FULL);
      expect(round.card.index).not.toBe(round.answerCard.index);
    }
  });

  it("returns 5 unique numeric choices including the answer", () => {
    const round = generateComputePrompt(stackOrder, "cyclic", FULL);
    expect(round.choices.kind).toBe("numbers");
    if (round.choices.kind === "numbers") {
      expect(round.choices.data).toHaveLength(5);
      expect(new Set(round.choices.data).size).toBe(5);
      expect(round.choices.data).toContain(round.distance);
    }
  });

  it("never returns 0 as a choice under signed convention", () => {
    for (let i = 0; i < 50; i += 1) {
      const round = generateComputePrompt(stackOrder, "signed", FULL);
      if (round.choices.kind === "numbers") {
        expect(round.choices.data).not.toContain(0);
      }
    }
  });

  it("respects restricted range", () => {
    const range = {
      end: createDeckPosition(20),
      start: createDeckPosition(10),
    };
    for (let i = 0; i < 30; i += 1) {
      const round = generateComputePrompt(stackOrder, "cyclic", range);
      expect(round.card.index).toBeGreaterThanOrEqual(10);
      expect(round.card.index).toBeLessThanOrEqual(20);
      expect(round.answerCard.index).toBeGreaterThanOrEqual(10);
      expect(round.answerCard.index).toBeLessThanOrEqual(20);
    }
  });
});

describe("generateApplyPrompt", () => {
  it("returns 5 unique card choices including the answer", () => {
    const round = generateApplyPrompt(stackOrder, "cyclic", FULL);
    expect(round.choices.kind).toBe("cards");
    if (round.choices.kind === "cards") {
      expect(round.choices.data).toHaveLength(5);
      const indices = round.choices.data.map((c) => c.index);
      expect(new Set(indices).size).toBe(5);
      expect(indices).toContain(round.answerCard.index);
    }
  });

  it("excludes the prompt card from the choices", () => {
    for (let i = 0; i < 30; i += 1) {
      const round = generateApplyPrompt(stackOrder, "cyclic", FULL);
      if (round.choices.kind === "cards") {
        const indices = round.choices.data.map((c) => c.index);
        expect(indices).not.toContain(round.card.index);
      }
    }
  });

  it("uses a non-zero offset", () => {
    for (let i = 0; i < 30; i += 1) {
      const round = generateApplyPrompt(stackOrder, "signed", FULL);
      expect(round.offset).not.toBe(0);
    }
  });

  it("respects restricted range — answer card stays inside the range", () => {
    const range = {
      end: createDeckPosition(25),
      start: createDeckPosition(15),
    };
    for (let i = 0; i < 30; i += 1) {
      const round = generateApplyPrompt(stackOrder, "cyclic", range);
      expect(round.answerCard.index).toBeGreaterThanOrEqual(15);
      expect(round.answerCard.index).toBeLessThanOrEqual(25);
    }
  });
});

describe("generateNextDistanceRound", () => {
  it("produces a compute round in compute mode", () => {
    const payload = generateNextDistanceRound(
      stackOrder,
      "compute",
      "cyclic",
      FULL
    );
    expect(payload.newDisplay).toBe("compute");
    if (payload.newDisplay === "compute") {
      expect(payload.newOffset).toBeNull();
      expect(payload.newExpectedDistance).not.toBeNull();
    }
  });

  it("produces an apply round in apply mode", () => {
    const payload = generateNextDistanceRound(
      stackOrder,
      "apply",
      "cyclic",
      FULL
    );
    expect(payload.newDisplay).toBe("apply");
    if (payload.newDisplay === "apply") {
      expect(payload.newExpectedDistance).toBeNull();
      expect(payload.newOffset).not.toBeNull();
    }
  });

  it("produces either kind in both mode (covers both branches over many tries)", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const payload = generateNextDistanceRound(
        stackOrder,
        "both",
        "cyclic",
        FULL
      );
      kinds.add(payload.newDisplay);
    }
    expect(kinds.has("compute")).toBe(true);
    expect(kinds.has("apply")).toBe(true);
  });

  it("freezes the convention into the payload", () => {
    const payload = generateNextDistanceRound(
      stackOrder,
      "compute",
      "signed",
      FULL
    );
    expect(payload.newConvention).toBe("signed");
  });

  it("generates a real (non-placeholder) round at exactly cycleSize === MIN_DISTANCE_RANGE", () => {
    // MIN_DISTANCE_RANGE is 6 — verify the boundary case generates a real
    // round (non-empty choices) rather than the placeholder.
    const exactlyMin = {
      end: createDeckPosition(6),
      start: createDeckPosition(1),
    };
    const payload = generateNextDistanceRound(
      stackOrder,
      "compute",
      "cyclic",
      exactlyMin
    );
    expect(payload.newDisplay).toBe("compute");
    if (payload.newDisplay === "compute") {
      expect(payload.newChoices.kind).toBe("numbers");
      expect(payload.newChoices.data.length).toBeGreaterThan(0);
      expect(payload.newExpectedDistance).not.toBeNull();
      expect(payload.newExpectedDistance).not.toBe(0);
      expect(payload.newAnswerCard.index).toBeGreaterThanOrEqual(1);
      expect(payload.newAnswerCard.index).toBeLessThanOrEqual(6);
      expect(payload.newCard.index).not.toBe(payload.newAnswerCard.index);
    }
    expect(payload.newCard.index).toBeGreaterThanOrEqual(1);
    expect(payload.newCard.index).toBeLessThanOrEqual(6);
  });

  it("returns a mode-independent range-too-small payload (no throw) when cycleSize < MIN_DISTANCE_RANGE", () => {
    const tooSmall = {
      end: createDeckPosition(5),
      start: createDeckPosition(1),
    };
    for (const mode of ["compute", "apply", "both"] as const) {
      const payload = generateNextDistanceRound(
        stackOrder,
        mode,
        "cyclic",
        tooSmall
      );
      expect(payload.newDisplay).toBe("range-too-small");
      expect(payload.newCard.index).toBe(tooSmall.start);
    }
  });
});

describe("isCorrectAnswer", () => {
  it("matches a numeric distance in compute mode", () => {
    const round = computeRound(5);
    expect(isCorrectAnswer({ kind: "compute", value: 5 }, round)).toBe(true);
    expect(isCorrectAnswer({ kind: "compute", value: 4 }, round)).toBe(false);
  });

  it("rejects a card answer in compute mode", () => {
    const round = computeRound(5);
    expect(isCorrectAnswer({ kind: "apply", value: FourOfClubs }, round)).toBe(
      false
    );
  });

  it("matches a card by suit and rank in apply mode", () => {
    const round = applyRound(3, cardAtPos2);
    expect(isCorrectAnswer({ kind: "apply", value: TwoOfHearts }, round)).toBe(
      true
    );
    expect(isCorrectAnswer({ kind: "apply", value: FourOfClubs }, round)).toBe(
      false
    );
  });

  it("rejects a number in apply mode", () => {
    const round = applyRound(3, cardAtPos2);
    expect(isCorrectAnswer({ kind: "compute", value: 5 }, round)).toBe(false);
  });

  it("rejects every answer (including 0) when the round is range-too-small", () => {
    // Without this guard an answer could silently score against an
    // unplayable round and pollute session stats. This test pins it.
    const round: DistanceRound = { display: "range-too-small" };
    expect(isCorrectAnswer({ kind: "compute", value: 0 }, round)).toBe(false);
    expect(isCorrectAnswer({ kind: "compute", value: 1 }, round)).toBe(false);
    expect(isCorrectAnswer({ kind: "apply", value: TwoOfHearts }, round)).toBe(
      false
    );
  });
});

describe("createInitialState", () => {
  it("starts with zero scores and a fresh round", () => {
    const state = createInitialState({
      convention: "cyclic",
      distanceMode: "compute",
      limits: FULL,
      stackOrder,
      timerDuration: 15,
    });
    expect(state.successes).toBe(0);
    expect(state.fails).toBe(0);
    expect(state.timeRemaining).toBe(15);
    expect(state.timerDuration).toBe(15);
    expect(state.display).toBe("compute");
  });

  it("starts an apply round under apply mode", () => {
    const state = createInitialState({
      convention: "cyclic",
      distanceMode: "apply",
      limits: FULL,
      stackOrder,
      timerDuration: 10,
    });
    expect(state.display).toBe("apply");
    expect(state.card.index).toBeGreaterThanOrEqual(1);
    expect(state.card.index).toBeLessThanOrEqual(52);
  });

  it("returns a range-too-small state without throwing when cycleSize < MIN_DISTANCE_RANGE", () => {
    const tooSmall = {
      end: createDeckPosition(5),
      start: createDeckPosition(1),
    };
    const state = createInitialState({
      convention: "cyclic",
      distanceMode: "compute",
      limits: tooSmall,
      stackOrder,
      timerDuration: 15,
    });
    expect(state.successes).toBe(0);
    expect(state.fails).toBe(0);
    expect(state.display).toBe("range-too-small");
    expect(state.card.index).toBe(tooSmall.start);
  });
});

describe("gameReducer", () => {
  const advancePayload = {
    newAnswerCard: cardAtPos2,
    newCard: cardAtPos1,
    newChoices: { data: [1, 2, 3, 4, 5], kind: "numbers" as const },
    newConvention: "cyclic" as const,
    newDisplay: "compute" as const,
    newExpectedDistance: 3,
    newOffset: null,
  };

  it("CORRECT_ANSWER increments successes, advances to next round, resets timer", () => {
    const initial = baseState({ timeRemaining: 5 });
    const next = gameReducer(initial, {
      payload: advancePayload,
      type: "CORRECT_ANSWER",
    });
    expect(next.successes).toBe(1);
    expect(next.fails).toBe(0);
    if (next.display === "compute") {
      expect(next.expectedDistance).toBe(3);
    }
    expect(next.timeRemaining).toBe(initial.timerDuration);
  });

  it("WRONG_ANSWER increments fails only — no advance, no timer reset", () => {
    const initial = baseState({ timeRemaining: 5 });
    const next = gameReducer(initial, { type: "WRONG_ANSWER" });
    expect(next.fails).toBe(1);
    expect(next.successes).toBe(0);
    if (next.display === "compute" && initial.display === "compute") {
      expect(next.expectedDistance).toBe(initial.expectedDistance);
    }
    expect(next.timeRemaining).toBe(5);
  });

  it("WRONG_ANSWER preserves the apply-round shape (offset, display)", () => {
    const initial: GameState = {
      card: cardAtPos1,
      fails: 0,
      successes: 0,
      ...applyRound(7, cardAtPos2),
      convention: "cyclic",
      timeRemaining: 5,
      timerDuration: 30,
    };
    const next = gameReducer(initial, { type: "WRONG_ANSWER" });
    expect(next.fails).toBe(1);
    expect(next.successes).toBe(0);
    expect(next.display).toBe("apply");
    if (next.display === "apply") {
      expect(next.offset).toBe(7);
      expect(next.answerCard).toBe(cardAtPos2);
    }
    expect(next.timeRemaining).toBe(5);
  });

  it("TIMEOUT increments fails and advances to next round", () => {
    const initial = baseState();
    const next = gameReducer(initial, {
      payload: advancePayload,
      type: "TIMEOUT",
    });
    expect(next.fails).toBe(1);
    expect(next.successes).toBe(0);
    if (next.display === "compute") {
      expect(next.expectedDistance).toBe(3);
    }
  });

  it("REVEAL_ANSWER increments fails and advances to next round", () => {
    const initial = baseState();
    const next = gameReducer(initial, {
      payload: advancePayload,
      type: "REVEAL_ANSWER",
    });
    expect(next.fails).toBe(1);
    if (next.display === "compute") {
      expect(next.expectedDistance).toBe(3);
    }
  });

  it("TICK decrements timeRemaining", () => {
    const initial = baseState({ timeRemaining: 10 });
    const next = gameReducer(initial, { type: "TICK" });
    expect(next.timeRemaining).toBe(9);
  });

  it("RESET_TIMER updates duration and timeRemaining", () => {
    const initial = baseState({ timeRemaining: 5, timerDuration: 30 });
    const next = gameReducer(initial, {
      payload: { duration: 10 },
      type: "RESET_TIMER",
    });
    expect(next.timeRemaining).toBe(10);
    expect(next.timerDuration).toBe(10);
  });

  it("RESET_GAME rebuilds state from initial config", () => {
    const initial = baseState({ fails: 3, successes: 5 });
    const next = gameReducer(initial, {
      payload: {
        convention: "signed",
        distanceMode: "compute",
        limits: FULL,
        stackOrder,
        timerDuration: 15,
      },
      type: "RESET_GAME",
    });
    expect(next.successes).toBe(0);
    expect(next.fails).toBe(0);
    expect(next.display).toBe("compute");
    expect(next.convention).toBe("signed");
  });
});
