import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DistanceConvention } from "../../types/distance";
import { DEFAULT_STACK_LIMITS } from "../../types/stack-limits";
import { createDeckPosition, type Stack, stacks } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import { formatCardName } from "../../utils/card-formatting";
import { computeDistance } from "../../utils/distance";
import { useDistanceGame } from "./use-distance-game";

const defaultTimerSettings: TimerSettings = { enabled: false, duration: 15 };

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("../../hooks/use-game-timer", () => {
  type TimerOpts = {
    onTimeout?: () => void;
    dispatch?: (action: unknown) => void;
    createTimeoutAction?: () => unknown;
  };
  let capturedOpts: TimerOpts | undefined;
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
    useGameTimer: vi.fn((opts: TimerOpts) => {
      capturedOpts = opts;
    }),
    __getCapturedOnTimeout: () => capturedOpts?.onTimeout,
    __triggerTimeout: () => {
      // Mirrors the real hook's order: side effects then dispatch.
      capturedOpts?.onTimeout?.();
      const action = capturedOpts?.createTimeoutAction?.();
      if (action !== undefined && capturedOpts?.dispatch) {
        capturedOpts.dispatch(action);
      }
    },
    __resetCapturedOnTimeout: () => {
      capturedOpts = undefined;
    },
  };
});

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: { DISTANCE_ANSWER: vi.fn() },
  },
}));

const testStack = stacks.mnemonica.order;
const stackName = stacks.mnemonica.name;

beforeEach(async () => {
  const timerModule = await import("../../hooks/use-game-timer");
  (
    timerModule as unknown as { __resetCapturedOnTimeout: () => void }
  ).__resetCapturedOnTimeout();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("useDistanceGame initial state", () => {
  it("returns successes=0, fails=0 on first render", () => {
    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS
      )
    );
    expect(result.current.score).toEqual({ successes: 0, fails: 0 });
  });

  it("starts in compute display when mode is compute", () => {
    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS
      )
    );
    const round = result.current.round;
    expect(round.display).toBe("compute");
    if (round.display === "compute") {
      expect(round.choices.kind).toBe("numbers");
    }
  });

  it("starts in apply display when mode is apply", () => {
    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "apply",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS
      )
    );
    const round = result.current.round;
    expect(round.display).toBe("apply");
    if (round.display === "apply") {
      expect(round.choices.kind).toBe("cards");
      expect(round.offset).not.toBeNull();
    }
  });
});

describe("useDistanceGame submitAnswer", () => {
  it("compute mode: correct numeric answer increments successes and advances", async () => {
    const { eventBus } = vi.mocked(await import("../../services/event-bus"));
    const onAnswer = vi.fn();

    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS,
        { onAnswer }
      )
    );

    const round = result.current.round;
    if (round.display !== "compute") {
      throw new Error("expected a compute round in compute mode");
    }
    const cardBefore = result.current.card;
    const expectedDistance = computeDistance(
      result.current.card.index - 1,
      round.answerCard.index - 1,
      "cyclic",
      DEFAULT_STACK_LIMITS
    );

    act(() => {
      result.current.submitAnswer({
        kind: "compute",
        value: expectedDistance,
      });
    });

    expect(result.current.score.successes).toBe(1);
    expect(result.current.score.fails).toBe(0);
    expect(result.current.card).not.toBe(cardBefore);
    expect(eventBus.emit.DISTANCE_ANSWER).toHaveBeenCalledWith({
      correct: true,
      stackName,
    });
    expect(onAnswer).toHaveBeenCalledWith({
      correct: true,
      questionAdvanced: true,
    });
  });

  it("compute mode: wrong numeric answer increments fails and does NOT advance", async () => {
    const { eventBus } = vi.mocked(await import("../../services/event-bus"));
    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS
      )
    );
    if (result.current.round.display !== "compute") {
      throw new Error("expected a compute round");
    }
    const cardBefore = result.current.card;
    // Submit a value far outside the distance set: 9999 is never a valid distance
    act(() => {
      result.current.submitAnswer({ kind: "compute", value: 9999 });
    });
    expect(result.current.score.fails).toBe(1);
    expect(result.current.score.successes).toBe(0);
    expect(result.current.card).toBe(cardBefore);
    expect(eventBus.emit.DISTANCE_ANSWER).toHaveBeenCalledWith({
      correct: false,
      stackName,
    });
  });

  it("apply mode: correct card increments successes and advances", async () => {
    const { eventBus } = vi.mocked(await import("../../services/event-bus"));
    const onAnswer = vi.fn();

    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "apply",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS,
        { onAnswer }
      )
    );

    const round = result.current.round;
    if (round.display !== "apply") {
      throw new Error("expected an apply round in apply mode");
    }
    const cardBefore = result.current.card;
    const correctCard = round.answerCard.card;

    act(() => {
      result.current.submitAnswer({ kind: "apply", value: correctCard });
    });

    expect(result.current.score.successes).toBe(1);
    expect(result.current.score.fails).toBe(0);
    expect(result.current.card).not.toBe(cardBefore);
    expect(eventBus.emit.DISTANCE_ANSWER).toHaveBeenCalledWith({
      correct: true,
      stackName,
    });
    expect(onAnswer).toHaveBeenCalledWith({
      correct: true,
      questionAdvanced: true,
    });
  });

  it("apply mode: wrong card increments fails and does NOT advance", async () => {
    const { eventBus } = vi.mocked(await import("../../services/event-bus"));
    const onAnswer = vi.fn();

    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "apply",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS,
        { onAnswer }
      )
    );

    const round = result.current.round;
    if (round.display !== "apply") {
      throw new Error("expected an apply round in apply mode");
    }
    // Round generation requires MIN_DISTANCE_RANGE (6) cards in scope, so
    // distinct distractors are guaranteed by construction. Assert it
    // explicitly so this test fails loudly if that invariant breaks.
    expect(round.choices.data.length).toBeGreaterThanOrEqual(2);
    const cardBefore = result.current.card;
    const correctCard = round.answerCard.card;
    const wrongCard = round.choices.data.find(
      (c) =>
        c.card.suit !== correctCard.suit || c.card.rank !== correctCard.rank
    );
    if (wrongCard === undefined) {
      throw new Error("expected at least one wrong card in choices");
    }

    act(() => {
      result.current.submitAnswer({ kind: "apply", value: wrongCard.card });
    });

    expect(result.current.score.fails).toBe(1);
    expect(result.current.score.successes).toBe(0);
    expect(result.current.card).toBe(cardBefore);
    expect(eventBus.emit.DISTANCE_ANSWER).toHaveBeenCalledWith({
      correct: false,
      stackName,
    });
    expect(onAnswer).toHaveBeenCalledWith({
      correct: false,
      questionAdvanced: false,
    });
  });
});

describe("useDistanceGame revealAnswer", () => {
  it("compute mode: shows a notification with the exact expected distance", async () => {
    const { notifications } = vi.mocked(await import("@mantine/notifications"));
    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS
      )
    );
    const round = result.current.round;
    if (round.display !== "compute") {
      throw new Error("expected a compute round in compute mode");
    }
    const expectedDistance = computeDistance(
      result.current.card.index - 1,
      round.answerCard.index - 1,
      "cyclic",
      DEFAULT_STACK_LIMITS
    );
    act(() => {
      result.current.revealAnswer();
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "yellow",
        message: String(expectedDistance),
      })
    );
  });

  it("apply mode: shows a notification with the exact answer card name", async () => {
    const { notifications } = vi.mocked(await import("@mantine/notifications"));
    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "apply",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS
      )
    );
    const round = result.current.round;
    if (round.display !== "apply") {
      throw new Error("expected an apply round in apply mode");
    }
    const expectedName = formatCardName(round.answerCard.card);
    act(() => {
      result.current.revealAnswer();
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "yellow",
        message: expectedName,
      })
    );
  });

  it("counts a reveal as a fail and advances", () => {
    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        defaultTimerSettings,
        DEFAULT_STACK_LIMITS
      )
    );
    const cardBefore = result.current.card;
    act(() => {
      result.current.revealAnswer();
    });
    expect(result.current.score.fails).toBe(1);
    expect(result.current.card).not.toBe(cardBefore);
  });
});

describe("useDistanceGame timeout flow", () => {
  it("fires the timeout notification + event + onAnswer callback", async () => {
    const { notifications } = vi.mocked(await import("@mantine/notifications"));
    const { eventBus } = vi.mocked(await import("../../services/event-bus"));
    const timerModule = vi.mocked(await import("../../hooks/use-game-timer"));
    const getCapturedOnTimeout = (
      timerModule as unknown as {
        __getCapturedOnTimeout: () => (() => void) | undefined;
      }
    ).__getCapturedOnTimeout;

    const onAnswer = vi.fn();
    renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        { enabled: true, duration: 10 },
        DEFAULT_STACK_LIMITS,
        { onAnswer }
      )
    );

    const onTimeout = getCapturedOnTimeout();
    expect(onTimeout).toBeDefined();
    onTimeout?.();

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({ color: "red" })
    );
    expect(eventBus.emit.DISTANCE_ANSWER).toHaveBeenCalledWith({
      correct: false,
      stackName,
    });
    expect(onAnswer).toHaveBeenCalledWith({
      correct: false,
      questionAdvanced: true,
    });
  });

  it("dispatches the timeout action: fails increments and the card advances", async () => {
    const timerModule = vi.mocked(await import("../../hooks/use-game-timer"));
    const triggerTimeout = (
      timerModule as unknown as { __triggerTimeout: () => void }
    ).__triggerTimeout;

    const { result } = renderHook(() =>
      useDistanceGame(
        testStack,
        stackName,
        "compute",
        "cyclic",
        { enabled: true, duration: 10 },
        DEFAULT_STACK_LIMITS
      )
    );

    const cardBefore = result.current.card;

    act(() => {
      triggerTimeout();
    });

    expect(result.current.score.fails).toBe(1);
    expect(result.current.score.successes).toBe(0);
    expect(result.current.card).not.toBe(cardBefore);
  });
});

describe("useDistanceGame reset on prop change", () => {
  it("resets when convention changes (next round respects new convention)", () => {
    const initialProps: { convention: DistanceConvention } = {
      convention: "cyclic",
    };
    const { result, rerender } = renderHook(
      ({ convention }: { convention: DistanceConvention }) =>
        useDistanceGame(
          testStack,
          stackName,
          "compute",
          convention,
          defaultTimerSettings,
          DEFAULT_STACK_LIMITS
        ),
      { initialProps }
    );

    expect(result.current.convention).toBe("cyclic");

    // Cyclic convention only generates positive distances (1..N-1) — sample
    // a handful of cyclic rounds to anchor the invariant.
    for (let i = 0; i < 20; i++) {
      const round = result.current.round;
      if (round.display === "compute") {
        for (const v of round.choices.data) {
          expect(v).toBeGreaterThanOrEqual(1);
        }
      }
      rerender({ convention: "cyclic" });
    }

    rerender({ convention: "signed" });
    expect(result.current.convention).toBe("signed");

    // After switching to signed, generate enough rounds to reliably
    // observe the convention's distinguishing feature: at least one
    // round must surface a negative value in its numeric choices.
    let sawNegative = false;
    for (let i = 0; i < 30; i++) {
      const round = result.current.round;
      if (
        round.display === "compute" &&
        round.choices.data.some((v) => v < 0)
      ) {
        sawNegative = true;
        break;
      }
      // Force a fresh round under the same signed convention.
      act(() => {
        result.current.revealAnswer();
      });
    }
    expect(sawNegative).toBe(true);
  });

  it("resets when limits change (score zeroes out)", () => {
    const { result, rerender } = renderHook(
      ({ limits }: { limits: typeof DEFAULT_STACK_LIMITS }) =>
        useDistanceGame(
          testStack,
          stackName,
          "compute",
          "cyclic",
          defaultTimerSettings,
          limits
        ),
      { initialProps: { limits: DEFAULT_STACK_LIMITS } }
    );

    rerender({
      limits: {
        start: createDeckPosition(1),
        end: createDeckPosition(6),
      },
    });
    expect(result.current.score.successes).toBe(0);
    expect(result.current.score.fails).toBe(0);
    expect(result.current.card.index).toBeGreaterThanOrEqual(1);
    expect(result.current.card.index).toBeLessThanOrEqual(6);
  });

  it("resets when stack changes (score zeroes out, card drawn from new stack)", () => {
    type Props = { stack: Stack; name: string };
    const initialProps: Props = { stack: testStack, name: stackName };
    const { result, rerender } = renderHook(
      ({ stack, name }: Props) =>
        useDistanceGame(
          stack,
          name,
          "compute",
          "cyclic",
          defaultTimerSettings,
          DEFAULT_STACK_LIMITS
        ),
      { initialProps }
    );

    act(() => {
      result.current.revealAnswer();
    });
    expect(result.current.score.fails).toBe(1);

    const cardBeforeStackChange = result.current.card.card;

    rerender({ stack: stacks.aronson.order, name: stacks.aronson.name });

    expect(result.current.score).toEqual({ successes: 0, fails: 0 });
    const { index, card } = result.current.card;
    expect(stacks.aronson.order[index - 1]).toBe(card);

    // The new card is drawn from the aronson stack. Mnemonica and aronson
    // share the same 52 cards, so the prompt card *could* coincidentally
    // be the same object identity as before — but the card should be
    // resolvable from the new stack at its index, and across multiple
    // re-resets we should observe at least one differing card. Pin the
    // stronger property: across many advances under the new stack the
    // hook should surface multiple distinct prompt cards (proving the
    // generator is actually re-running against the new stack and not
    // sticky on the old prompt).
    const observedCards = new Set<string>();
    observedCards.add(`${card.suit}-${card.rank}`);
    for (let i = 0; i < 40 && observedCards.size < 2; i++) {
      act(() => {
        result.current.revealAnswer();
      });
      const next = result.current.card.card;
      observedCards.add(`${next.suit}-${next.rank}`);
    }
    expect(observedCards.size).toBeGreaterThanOrEqual(2);
    // Sanity: the previous-stack prompt card identity is recorded so a
    // future regression that froze prompts across stack changes would be
    // visible in test output. Not asserted directly because mnemonica and
    // aronson share the deck, so the same card could legitimately appear.
    expect(cardBeforeStackChange).toBeDefined();
  });
});
