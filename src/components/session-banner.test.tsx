import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import type { ActiveSession } from "../types/session";
import { SessionBanner } from "./session-banner";

const createMockSession = (
  overrides?: Partial<ActiveSession>
): ActiveSession => ({
  id: "test-session-id",
  mode: "flashcard",
  stackKey: "mnemonica",
  config: { type: "structured", totalQuestions: 10 },
  startedAt: new Date().toISOString(),
  successes: 0,
  fails: 0,
  questionsCompleted: 0,
  currentStreak: 0,
  bestStreak: 0,
  ...overrides,
});

describe("SessionBanner", () => {
  it("renders progress as completed/total for structured sessions", () => {
    const session = createMockSession({
      config: { type: "structured", totalQuestions: 20 },
      questionsCompleted: 8,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const progressBadge = screen.getByLabelText("Progress: 8/20");
    expect(progressBadge).toBeInTheDocument();
    expect(progressBadge).toHaveTextContent("8/20");
  });

  it("renders progress as just the count for open sessions", () => {
    const session = createMockSession({
      config: { type: "open" },
      questionsCompleted: 15,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const progressBadge = screen.getByLabelText("Progress: 15");
    expect(progressBadge).toBeInTheDocument();
    expect(progressBadge).toHaveTextContent("15");
  });

  it("renders the Score component with correct success and fail counts", () => {
    const session = createMockSession({
      successes: 12,
      fails: 3,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const successBadge = screen.getByLabelText("Correct answers: 12");
    expect(successBadge).toBeInTheDocument();
    expect(successBadge).toHaveTextContent("12");

    const failBadge = screen.getByLabelText("Incorrect answers: 3");
    expect(failBadge).toBeInTheDocument();
    expect(failBadge).toHaveTextContent("3");
  });

  it("renders accuracy percentage", () => {
    const session = createMockSession({
      successes: 7,
      fails: 3,
      // 7/(7+3) = 0.7 = 70%
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const accuracyBadge = screen.getByLabelText("Accuracy: 70%");
    expect(accuracyBadge).toBeInTheDocument();
    expect(accuracyBadge).toHaveTextContent("70%");
  });

  it("renders current streak count", () => {
    const session = createMockSession({
      currentStreak: 5,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const streakBadge = screen.getByLabelText("Current streak: 5");
    expect(streakBadge).toBeInTheDocument();
    expect(streakBadge).toHaveTextContent("5");
  });

  it("renders best streak count", () => {
    const session = createMockSession({
      bestStreak: 8,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const bestStreakBadge = screen.getByLabelText("Best streak: 8");
    expect(bestStreakBadge).toBeInTheDocument();
    expect(bestStreakBadge).toHaveTextContent("8");
  });

  it("calls onStop when the Stop button is clicked", async () => {
    const user = userEvent.setup();
    const handleStop = vi.fn();
    const session = createMockSession();

    render(<SessionBanner onStop={handleStop} session={session} />);

    const stopButton = screen.getByRole("button", { name: "Stop" });
    await user.click(stopButton);

    expect(handleStop).toHaveBeenCalledOnce();
  });
});
