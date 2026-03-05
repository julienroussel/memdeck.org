import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render } from "../../test-utils";
import { makeSessionRecord } from "../../test-utils/session-factories";
import { AccuracyChart, getAccuracyColor } from "./accuracy-chart";

const NO_SESSIONS_MATCH_PATTERN = /no sessions match/i;

describe("getAccuracyColor", () => {
  it("returns 'green' for percent >= 80", () => {
    expect(getAccuracyColor(80)).toBe("green");
    expect(getAccuracyColor(90)).toBe("green");
    expect(getAccuracyColor(100)).toBe("green");
  });

  it("returns 'yellow' for percent >= 50 and < 80", () => {
    expect(getAccuracyColor(50)).toBe("yellow");
    expect(getAccuracyColor(60)).toBe("yellow");
    expect(getAccuracyColor(79)).toBe("yellow");
  });

  it("returns 'red' for percent < 50", () => {
    expect(getAccuracyColor(0)).toBe("red");
    expect(getAccuracyColor(30)).toBe("red");
    expect(getAccuracyColor(49)).toBe("red");
  });
});

describe("AccuracyChart", () => {
  const neighborSession = makeSessionRecord({
    id: "neighbor-1",
    mode: "flashcard",
    flashcardMode: "neighbor",
    accuracy: 0.9,
    successes: 9,
    fails: 1,
    questionsCompleted: 10,
  });

  const positionSession = makeSessionRecord({
    id: "position-1",
    mode: "flashcard",
    flashcardMode: "cardonly",
    accuracy: 0.7,
    successes: 7,
    fails: 3,
    questionsCompleted: 10,
  });

  const legacyFlashcardSession = makeSessionRecord({
    id: "legacy-1",
    mode: "flashcard",
    accuracy: 0.6,
    successes: 6,
    fails: 4,
    questionsCompleted: 10,
  });

  const acaanSession = makeSessionRecord({
    id: "acaan-1",
    mode: "acaan",
    accuracy: 0.5,
    successes: 5,
    fails: 5,
    questionsCompleted: 10,
  });

  const spotCheckMissing = makeSessionRecord({
    id: "spotcheck-missing",
    mode: "spotcheck",
    spotCheckMode: "missing",
    accuracy: 0.8,
    successes: 8,
    fails: 2,
    questionsCompleted: 10,
  });

  const spotCheckSwapped = makeSessionRecord({
    id: "spotcheck-swapped",
    mode: "spotcheck",
    spotCheckMode: "swapped",
    accuracy: 0.6,
    successes: 6,
    fails: 4,
    questionsCompleted: 10,
  });

  const allSessions = [
    neighborSession,
    positionSession,
    legacyFlashcardSession,
    acaanSession,
    spotCheckMissing,
    spotCheckSwapped,
  ];

  it("renders the sub-filter when filter is set to flashcard", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("Flashcard"));

    expect(
      screen.getByRole("radiogroup", {
        name: "Filter by flashcard sub-mode",
      })
    ).toBeInTheDocument();
  });

  it("does not render the sub-filter when filter is all", () => {
    render(<AccuracyChart history={allSessions} />);

    expect(
      screen.queryByRole("radiogroup", {
        name: "Filter by flashcard sub-mode",
      })
    ).not.toBeInTheDocument();
  });

  it("does not render the sub-filter when filter is acaan", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("ACAAN"));

    expect(
      screen.queryByRole("radiogroup", {
        name: "Filter by flashcard sub-mode",
      })
    ).not.toBeInTheDocument();
  });

  it("shows only neighbor sessions when sub-filter is set to neighbor", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("Flashcard"));

    const subFilter = screen.getByRole("radiogroup", {
      name: "Filter by flashcard sub-mode",
    });
    await user.click(within(subFilter).getByText("Neighbor"));

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(1);
    expect(progressBars[0]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("9/10")
    );
  });

  it("shows non-neighbor flashcard sessions including legacy records when sub-filter is set to position", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("Flashcard"));

    const subFilter = screen.getByRole("radiogroup", {
      name: "Filter by flashcard sub-mode",
    });
    await user.click(within(subFilter).getByText("Position"));

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(2);
  });

  it("renders nothing when history is empty", () => {
    render(<AccuracyChart history={[]} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("shows empty state message when filter excludes all sessions", async () => {
    const user = userEvent.setup();
    // Only has ACAAN sessions, no flashcard neighbor sessions
    const acaanOnly = [acaanSession];
    render(<AccuracyChart history={acaanOnly} />);

    // Filter to flashcard mode — no flashcard sessions exist
    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("Flashcard"));

    expect(screen.getByText(NO_SESSIONS_MATCH_PATTERN)).toBeInTheDocument();
  });

  it("limits displayed sessions to 20 when more are provided", () => {
    const sessions = Array.from({ length: 25 }, (_, i) =>
      makeSessionRecord({
        id: `session-${i}`,
        accuracy: (i + 1) / 25,
        successes: i + 1,
        fails: 25 - (i + 1),
        questionsCompleted: 25,
      })
    );

    render(<AccuracyChart history={sessions} />);

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(20);
  });

  it("displays the most recent 20 sessions from newest-first history", () => {
    const sessions = Array.from({ length: 25 }, (_, i) =>
      makeSessionRecord({
        id: `session-${i}`,
        accuracy: (i + 1) / 25,
        successes: i + 1,
        fails: 25 - (i + 1),
        questionsCompleted: 25,
      })
    );

    render(<AccuracyChart history={sessions} />);

    const progressBars = screen.getAllByRole("progressbar");
    // History is newest-first, slice(0, 20) takes the 20 most recent, reverse() displays oldest-first
    // So the first bar should be session-19 (20th item, reversed to first) and last bar should be session-0
    expect(progressBars[0]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("20/25")
    );
    expect(progressBars[19]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("1/25")
    );
  });

  it("renders the spot check sub-filter when filter is set to spotcheck", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("Spot Check"));

    expect(
      screen.getByRole("radiogroup", {
        name: "Filter by spot check sub-mode",
      })
    ).toBeInTheDocument();
  });

  it("shows only missing spot check sessions when sub-filter is set to missing", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("Spot Check"));

    const subFilter = screen.getByRole("radiogroup", {
      name: "Filter by spot check sub-mode",
    });
    await user.click(within(subFilter).getByText("Missing"));

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(1);
    expect(progressBars[0]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("8/10")
    );
  });

  it("resets both sub-filters when switching between flashcard and spotcheck", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });

    // Select flashcard → neighbor sub-filter
    await user.click(within(modeFilter).getByText("Flashcard"));
    const flashcardSubFilter = screen.getByRole("radiogroup", {
      name: "Filter by flashcard sub-mode",
    });
    await user.click(within(flashcardSubFilter).getByText("Neighbor"));

    // Switch to spotcheck → missing sub-filter
    await user.click(within(modeFilter).getByText("Spot Check"));
    const spotCheckSubFilter = screen.getByRole("radiogroup", {
      name: "Filter by spot check sub-mode",
    });
    await user.click(within(spotCheckSubFilter).getByText("Missing"));

    // Switch back to flashcard — flashcard sub-filter should be reset to "all"
    await user.click(within(modeFilter).getByText("Flashcard"));
    const progressBars = screen.getAllByRole("progressbar");
    // All 3 flashcard sessions (neighbor + position + legacy) should show
    expect(progressBars).toHaveLength(3);
  });

  it("resets sub-filter to all when main filter changes away from flashcard", async () => {
    const user = userEvent.setup();
    render(<AccuracyChart history={allSessions} />);

    // Select flashcard filter
    const modeFilter = screen.getByRole("radiogroup", {
      name: "Filter by mode",
    });
    await user.click(within(modeFilter).getByText("Flashcard"));

    // Select neighbor sub-filter
    const subFilter = screen.getByRole("radiogroup", {
      name: "Filter by flashcard sub-mode",
    });
    await user.click(within(subFilter).getByText("Neighbor"));

    // Switch to "All" main filter
    await user.click(within(modeFilter).getByText("All"));

    // Sub-filter should be gone
    expect(
      screen.queryByRole("radiogroup", {
        name: "Filter by flashcard sub-mode",
      })
    ).not.toBeInTheDocument();

    // Switch back to flashcard — sub-filter should default to "all" (showing all 3 flashcard sessions)
    await user.click(within(modeFilter).getByText("Flashcard"));

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(3);
  });
});
