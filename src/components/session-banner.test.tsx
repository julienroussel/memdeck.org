import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { makeActiveSession } from "../test-utils/session-factories";
import { SessionBanner } from "./session-banner";

/**
 * Each badge exposes its meaning as visually hidden text (reachable in browse
 * mode) followed by the visible value, which is hidden from assistive tech.
 */
const expectBadge = (label: string, value: string) => {
  const hiddenLabel = screen.getByText(label);
  const visibleValue = hiddenLabel.nextElementSibling;
  expect(visibleValue).toHaveTextContent(value);
  expect(visibleValue).toHaveAttribute("aria-hidden", "true");
  expect(hiddenLabel.closest(".mantine-Badge-root")).not.toHaveAttribute(
    "aria-label"
  );
};

describe("SessionBanner", () => {
  it("renders progress as completed/total for structured sessions", () => {
    const session = makeActiveSession({
      config: { totalQuestions: 20, type: "structured" },
      questionsCompleted: 8,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    expectBadge("Progress: 8/20", "8/20");
  });

  it("renders progress as just the count for open sessions", () => {
    const session = makeActiveSession({
      config: { type: "open" },
      questionsCompleted: 15,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    expectBadge("Progress: 15", "15");
  });

  it("renders the Score component with correct success and fail counts", () => {
    const session = makeActiveSession({
      fails: 3,
      successes: 12,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    expect(screen.getByTestId("score-success")).toHaveTextContent("12");
    expect(screen.getByTestId("score-fail")).toHaveTextContent("3");
  });

  it("renders accuracy percentage", () => {
    const session = makeActiveSession({
      fails: 3,
      successes: 7,
      // 7/(7+3) = 0.7 = 70%
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    expectBadge("Accuracy: 70%", "70%");
  });

  it("renders current streak count", () => {
    const session = makeActiveSession({
      currentStreak: 5,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    expectBadge("Current streak: 5", "5");
  });

  it("renders best streak count", () => {
    const session = makeActiveSession({
      bestStreak: 8,
    });

    render(<SessionBanner onStop={vi.fn()} session={session} />);

    expectBadge("Best streak: 8", "8");
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
