import { describe, expect, it, vi } from "vitest";
import {
  makeActiveSession,
  makeSummary,
} from "../test-utils/session-factories";
import type { AnswerOutcome, SessionPhase } from "../types/session";
import {
  applyAnswerOutcome,
  deriveActiveSession,
  deriveIsStructuredSession,
  meetsMinimumSaveThreshold,
} from "./session-phase";

describe("deriveActiveSession", () => {
  it("returns the session when phase is active", () => {
    const session = makeActiveSession();
    const status: SessionPhase = { phase: "active", session };

    expect(deriveActiveSession(status)).toBe(session);
  });

  it("returns null when phase is idle", () => {
    const status: SessionPhase = { phase: "idle" };

    expect(deriveActiveSession(status)).toBeNull();
  });

  it("returns null when phase is summary", () => {
    const status: SessionPhase = { phase: "summary", summary: makeSummary() };

    expect(deriveActiveSession(status)).toBeNull();
  });
});

describe("deriveIsStructuredSession", () => {
  it("returns true for a structured session config", () => {
    const session = makeActiveSession({
      config: { type: "structured", totalQuestions: 10 },
    });

    expect(deriveIsStructuredSession(session)).toBe(true);
  });

  it("returns false for an open session config", () => {
    const session = makeActiveSession({ config: { type: "open" } });

    expect(deriveIsStructuredSession(session)).toBe(false);
  });

  it("returns false when session is null", () => {
    expect(deriveIsStructuredSession(null)).toBe(false);
  });
});

describe("applyAnswerOutcome", () => {
  it("calls recordCorrect and recordQuestionAdvanced when correct and advanced", () => {
    const callbacks = {
      recordCorrect: vi.fn(),
      recordIncorrect: vi.fn(),
      recordQuestionAdvanced: vi.fn(),
    };
    const outcome: AnswerOutcome = { correct: true, questionAdvanced: true };

    applyAnswerOutcome(outcome, callbacks);

    expect(callbacks.recordCorrect).toHaveBeenCalledOnce();
    expect(callbacks.recordIncorrect).not.toHaveBeenCalled();
    expect(callbacks.recordQuestionAdvanced).toHaveBeenCalledOnce();
  });

  it("calls recordIncorrect when the answer is incorrect", () => {
    const callbacks = {
      recordCorrect: vi.fn(),
      recordIncorrect: vi.fn(),
      recordQuestionAdvanced: vi.fn(),
    };
    const outcome: AnswerOutcome = { correct: false, questionAdvanced: false };

    applyAnswerOutcome(outcome, callbacks);

    expect(callbacks.recordIncorrect).toHaveBeenCalledOnce();
    expect(callbacks.recordCorrect).not.toHaveBeenCalled();
  });

  it("calls recordQuestionAdvanced when advanced regardless of correctness", () => {
    const callbacks = {
      recordCorrect: vi.fn(),
      recordIncorrect: vi.fn(),
      recordQuestionAdvanced: vi.fn(),
    };
    const outcome: AnswerOutcome = { correct: false, questionAdvanced: true };

    applyAnswerOutcome(outcome, callbacks);

    expect(callbacks.recordIncorrect).toHaveBeenCalledOnce();
    expect(callbacks.recordQuestionAdvanced).toHaveBeenCalledOnce();
  });

  it("does not call recordQuestionAdvanced when question did not advance", () => {
    const callbacks = {
      recordCorrect: vi.fn(),
      recordIncorrect: vi.fn(),
      recordQuestionAdvanced: vi.fn(),
    };
    const outcome: AnswerOutcome = { correct: true, questionAdvanced: false };

    applyAnswerOutcome(outcome, callbacks);

    expect(callbacks.recordCorrect).toHaveBeenCalledOnce();
    expect(callbacks.recordQuestionAdvanced).not.toHaveBeenCalled();
  });
});

describe("meetsMinimumSaveThreshold", () => {
  it("returns false for a structured session with 0 questions completed", () => {
    const session = makeActiveSession({
      config: { type: "structured", totalQuestions: 10 },
      questionsCompleted: 0,
    });

    expect(meetsMinimumSaveThreshold(session)).toBe(false);
  });

  it("returns true for a structured session with 1 or more questions completed", () => {
    const session = makeActiveSession({
      config: { type: "structured", totalQuestions: 10 },
      questionsCompleted: 1,
    });

    expect(meetsMinimumSaveThreshold(session)).toBe(true);
  });

  it("returns false for an open session with fewer than 3 questions completed", () => {
    for (const count of [0, 1, 2]) {
      const session = makeActiveSession({
        config: { type: "open" },
        questionsCompleted: count,
      });

      expect(meetsMinimumSaveThreshold(session)).toBe(false);
    }
  });

  it("returns true for an open session with 3 or more questions completed", () => {
    const session = makeActiveSession({
      config: { type: "open" },
      questionsCompleted: 3,
    });

    expect(meetsMinimumSaveThreshold(session)).toBe(true);
  });
});
