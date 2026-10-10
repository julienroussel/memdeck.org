import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "../test-utils";
import { Score } from "./score";

const getLiveRegion = () => screen.getByTestId("score-live-region");

describe("Score", () => {
  it("renders the successes count with its meaning as hidden text", () => {
    render(<Score fails={2} successes={5} />);

    const successBadge = screen.getByTestId("score-success");
    expect(successBadge).toHaveTextContent("5");
    expect(within(successBadge).getByText("Correct answers: 5")).toHaveClass(
      "sr-only"
    );
    expect(successBadge).not.toHaveAttribute("aria-label");
  });

  it("renders the fails count with its meaning as hidden text", () => {
    render(<Score fails={7} successes={3} />);

    const failBadge = screen.getByTestId("score-fail");
    expect(failBadge).toHaveTextContent("7");
    expect(within(failBadge).getByText("Incorrect answers: 7")).toHaveClass(
      "sr-only"
    );
    expect(failBadge).not.toHaveAttribute("aria-label");
  });

  it("renders zero counts when given zero values", () => {
    render(<Score fails={0} successes={0} />);

    expect(
      within(screen.getByTestId("score-success")).getByText(
        "Correct answers: 0"
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("score-fail")).getByText("Incorrect answers: 0")
    ).toBeInTheDocument();
  });

  it("announces the score in the live region on the first answer", () => {
    render(<Score fails={0} successes={1} />);

    const liveRegion = getLiveRegion();
    expect(liveRegion).toHaveTextContent("Correct answers: 1");
    expect(liveRegion).toHaveTextContent("Incorrect answers: 0");
  });

  it("announces the score when the total answer count reaches 5", () => {
    render(<Score fails={2} successes={3} />);

    const liveRegion = getLiveRegion();
    expect(liveRegion).toHaveTextContent("Correct answers: 3");
    expect(liveRegion).toHaveTextContent("Incorrect answers: 2");
  });

  it("announces the score when total reaches 10", () => {
    render(<Score fails={4} successes={6} />);

    const liveRegion = getLiveRegion();
    expect(liveRegion).toHaveTextContent("Correct answers: 6");
    expect(liveRegion).toHaveTextContent("Incorrect answers: 4");
  });

  it("does not announce the score when total is zero", () => {
    render(<Score fails={0} successes={0} />);

    const liveRegion = getLiveRegion();
    expect(liveRegion).toHaveTextContent("");
  });

  it.each([
    { fails: 1, successes: 1 },
    { fails: 1, successes: 2 },
    { fails: 2, successes: 2 },
  ])(
    "throttles announcements between milestones (fails=$fails, successes=$successes)",
    ({ fails, successes }) => {
      // Aria-live is throttled to first answer + every 5th total to avoid
      // screen-reader overload during fast-paced training. Totals 2, 3, and 4
      // must NOT produce an announcement.
      render(<Score fails={fails} successes={successes} />);

      const liveRegion = getLiveRegion();
      expect(liveRegion).toHaveTextContent("");
    }
  );
});
