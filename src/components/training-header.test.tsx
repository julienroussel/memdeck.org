import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import type { ActiveSession } from "../types/session";
import { TrainingHeader } from "./training-header";

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

const defaultProps = {
  title: "Flashcard",
  settingsAriaLabel: "Flashcard settings",
  onOpenSettings: vi.fn(),
  score: { successes: 3, fails: 1 },
  isStructuredSession: false,
  activeSession: null,
  onStopSession: vi.fn(),
  onStartSession: vi.fn(),
};

describe("TrainingHeader", () => {
  it("renders the title and settings button with correct aria-label", () => {
    render(<TrainingHeader {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Flashcard" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Flashcard settings" })
    ).toBeInTheDocument();
  });

  it("shows Score when isStructuredSession is false", () => {
    render(
      <TrainingHeader
        {...defaultProps}
        isStructuredSession={false}
        score={{ successes: 5, fails: 2 }}
      />
    );

    expect(screen.getByLabelText("Correct answers: 5")).toBeInTheDocument();
    expect(screen.getByLabelText("Incorrect answers: 2")).toBeInTheDocument();
  });

  it("hides Score when isStructuredSession is true", () => {
    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={createMockSession()}
        isStructuredSession={true}
        score={{ successes: 5, fails: 2 }}
      />
    );

    expect(
      screen.queryByLabelText("Correct answers: 5")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Incorrect answers: 2")
    ).not.toBeInTheDocument();
  });

  it("shows SessionBanner when isStructuredSession is true and activeSession is non-null", () => {
    const session = createMockSession({
      config: { type: "structured", totalQuestions: 20 },
      questionsCompleted: 5,
    });

    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={session}
        isStructuredSession={true}
      />
    );

    expect(screen.getByLabelText("Progress: 5/20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("does not show SessionBanner when isStructuredSession is true but activeSession is null", () => {
    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={null}
        isStructuredSession={true}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Stop" })
    ).not.toBeInTheDocument();
  });

  it("shows SessionStartControls when isStructuredSession is false", () => {
    render(<TrainingHeader {...defaultProps} isStructuredSession={false} />);

    expect(screen.getByText("Start session:")).toBeInTheDocument();
  });

  it("hides SessionStartControls when isStructuredSession is true", () => {
    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={createMockSession()}
        isStructuredSession={true}
      />
    );

    expect(screen.queryByText("Start session:")).not.toBeInTheDocument();
  });

  it("calls onOpenSettings when settings button is clicked", async () => {
    const user = userEvent.setup();
    const handleOpenSettings = vi.fn();

    render(
      <TrainingHeader {...defaultProps} onOpenSettings={handleOpenSettings} />
    );

    await user.click(
      screen.getByRole("button", { name: "Flashcard settings" })
    );

    expect(handleOpenSettings).toHaveBeenCalledOnce();
  });

  it("calls onStopSession when stop button is clicked in session banner", async () => {
    const user = userEvent.setup();
    const handleStopSession = vi.fn();

    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={createMockSession()}
        isStructuredSession={true}
        onStopSession={handleStopSession}
      />
    );

    await user.click(screen.getByRole("button", { name: "Stop" }));

    expect(handleStopSession).toHaveBeenCalledOnce();
  });

  it("calls onStartSession with correct config when a session preset is clicked", async () => {
    const user = userEvent.setup();
    const handleStartSession = vi.fn();

    render(
      <TrainingHeader
        {...defaultProps}
        isStructuredSession={false}
        onStartSession={handleStartSession}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Start 10 question session" })
    );

    expect(handleStartSession).toHaveBeenCalledOnce();
    expect(handleStartSession).toHaveBeenCalledWith({
      type: "structured",
      totalQuestions: 10,
    });
  });
});
