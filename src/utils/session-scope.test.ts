import { describe, expect, it } from "vitest";
import { makeActiveSession } from "../test-utils/session-factories";
import type { ActiveSession } from "../types/session";
import type { StackLimits } from "../types/stack-limits";
import { DEFAULT_STACK_LIMITS } from "../types/stack-limits";
import { createDeckPosition } from "../types/stacks";
import { getScopeSize, hasScope, withScope } from "./session-scope";

const focusList = [3, 7, 9, 12, 40].map(createDeckPosition);
const distanceSession: ActiveSession = {
  bestStreak: 0,
  config: { type: "open" },
  currentStreak: 0,
  distanceConvention: "cyclic",
  distanceMode: "both",
  fails: 0,
  id: "distance-session",
  mode: "distance",
  questionsCompleted: 0,
  stackKey: "mnemonica",
  startedAt: "2025-01-01T00:00:00.000Z",
  successes: 0,
  timed: false,
};
const range: StackLimits = {
  end: createDeckPosition(20),
  start: createDeckPosition(1),
};

describe("getScopeSize", () => {
  it("counts the focus list when one is set", () => {
    expect(getScopeSize({ focusPositions: focusList })).toBe(5);
  });

  it("counts the range otherwise, and the full deck without one", () => {
    expect(getScopeSize({ stackLimits: range })).toBe(20);
    expect(getScopeSize({ stackLimits: undefined })).toBe(52);
  });
});

describe("hasScope and withScope", () => {
  const focusSession = withScope(makeActiveSession(), "mnemonica", {
    focusPositions: focusList,
  });

  it("matches a Flashcard session's focus list by content", () => {
    expect(
      hasScope(focusSession, "mnemonica", { focusPositions: [...focusList] })
    ).toBe(true);
    expect(
      hasScope(focusSession, "mnemonica", {
        stackLimits: DEFAULT_STACK_LIMITS,
      })
    ).toBe(false);
  });

  it("tells one focus list from another of the same or a different length", () => {
    const sameLength = [3, 7, 9, 12, 41].map(createDeckPosition);
    const longer = [...focusList, createDeckPosition(52)];
    expect(
      hasScope(focusSession, "mnemonica", { focusPositions: sameLength })
    ).toBe(false);
    expect(
      hasScope(focusSession, "mnemonica", { focusPositions: longer })
    ).toBe(false);
  });

  it("records a focus list without a range, and a range without a list", () => {
    expect(focusSession).toMatchObject({
      focusPositions: focusList,
      stackLimits: undefined,
    });
    const rangeSession = withScope(focusSession, "mnemonica", {
      stackLimits: range,
    });
    expect(rangeSession).toMatchObject({
      focusPositions: undefined,
      stackLimits: range,
    });
  });

  it("leaves a session of another stack with its own scope", () => {
    expect(hasScope(focusSession, "aronson", { stackLimits: range })).toBe(
      true
    );
    expect(withScope(focusSession, "aronson", { stackLimits: range })).toBe(
      focusSession
    );
  });

  it("never records a focus list on another mode", () => {
    const session = withScope(distanceSession, "mnemonica", {
      focusPositions: focusList,
    });
    expect(session).not.toHaveProperty("focusPositions");
    expect(session.stackLimits).toBeUndefined();
    expect(
      hasScope(
        withScope(distanceSession, "mnemonica", { stackLimits: range }),
        "mnemonica",
        { stackLimits: range }
      )
    ).toBe(true);
  });
});
