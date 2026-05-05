import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "../test-utils";
import { Score } from "./score";

const getLiveRegion = () => screen.getByTestId("score-live-region");

describe("Score", () => {
  it("renders the successes count", () => {
    render(<Score fails={2} successes={5} />);

    const successBadge = screen.getByLabelText("Correct answers: 5");
    expect(successBadge).toBeInTheDocument();
    expect(successBadge).toHaveTextContent("5");
  });

  it("renders the fails count", () => {
    render(<Score fails={7} successes={3} />);

    const failBadge = screen.getByLabelText("Incorrect answers: 7");
    expect(failBadge).toBeInTheDocument();
    expect(failBadge).toHaveTextContent("7");
  });

  it("renders zero counts when given zero values", () => {
    render(<Score fails={0} successes={0} />);

    const successBadge = screen.getByLabelText("Correct answers: 0");
    expect(successBadge).toBeInTheDocument();
    expect(successBadge).toHaveTextContent("0");

    const failBadge = screen.getByLabelText("Incorrect answers: 0");
    expect(failBadge).toBeInTheDocument();
    expect(failBadge).toHaveTextContent("0");
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
  ])("throttles announcements between milestones (fails=$fails, successes=$successes)", ({
    fails,
    successes,
  }) => {
    // Aria-live is throttled to first answer + every 5th total to avoid
    // screen-reader overload during fast-paced training. Totals 2, 3, and 4
    // must NOT produce an announcement.
    render(<Score fails={fails} successes={successes} />);

    const liveRegion = getLiveRegion();
    expect(liveRegion).toHaveTextContent("");
  });
});
