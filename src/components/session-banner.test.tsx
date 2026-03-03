import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { makeActiveSession } from "../test-utils/session-factories";
import { SessionBanner } from "./session-banner";

describe("SessionBanner", () => {
  it("renders progress as completed/total for structured sessions", () => {
    const session = makeActiveSession({
      config: { type: "structured", totalQuestions: 20 },
      questionsCompleted: 8,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const progressBadge = screen.getByLabelText("Progress: 8/20");
    expect(progressBadge).toBeInTheDocument();
    expect(progressBadge).toHaveTextContent("8/20");
  });

  it("renders progress as just the count for open sessions", () => {
    const session = makeActiveSession({
      config: { type: "open" },
      questionsCompleted: 15,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const progressBadge = screen.getByLabelText("Progress: 15");
    expect(progressBadge).toBeInTheDocument();
    expect(progressBadge).toHaveTextContent("15");
  });

  it("renders the Score component with correct success and fail counts", () => {
    const session = makeActiveSession({
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
    const session = makeActiveSession({
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
    const session = makeActiveSession({
      currentStreak: 5,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    const streakBadge = screen.getByLabelText("Current streak: 5");
    expect(streakBadge).toBeInTheDocument();
    expect(streakBadge).toHaveTextContent("5");
  });

  it("renders best streak count", () => {
    const session = makeActiveSession({
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
    const session = makeActiveSession();

    render(<SessionBanner onStop={handleStop} session={session} />);

    const stopButton = screen.getByRole("button", { name: "Stop" });
    await user.click(stopButton);

    expect(handleStop).toHaveBeenCalledOnce();
  });
});
