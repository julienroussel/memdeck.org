import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { makeActiveSession } from "../test-utils/session-factories";
import { TrainingHeader } from "./training-header";

const defaultProps = {
  activeSession: null,
  onStartSession: vi.fn(),
  onStopSession: vi.fn(),
  score: { fails: 1, successes: 3 },
  sessionTooltip: "Start a session",
  settingsContent: <div data-testid="settings-content">Settings</div>,
  settingsTooltip: "Flashcard settings",
  title: "Flashcard",
};

// happy-dom has no layout: every element is a 0x0 rect at the origin and the
// viewport is 0x0, which floating-ui's hide middleware reports as a detached
// reference, so Mantine renders the dropdown with display: none and its focus
// trap finds nothing focusable. A non-empty rect inside a non-empty viewport
// keeps the dropdown visible.
const stubLayoutRects = () => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(100, 100, 40, 40)
  );
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
    1024
  );
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
    768
  );
};

describe("TrainingHeader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the title and settings button with correct aria-label", () => {
    render(<TrainingHeader {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Flashcard" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Flashcard settings" })
    ).toBeInTheDocument();
  });

  it("renders the session button with correct aria-label", () => {
    render(<TrainingHeader {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: "Start a session" })
    ).toBeInTheDocument();
  });

  it("shows Score when there is no structured session", () => {
    render(
      <TrainingHeader {...defaultProps} score={{ fails: 2, successes: 5 }} />
    );

    expect(screen.getByText("Correct answers: 5")).toBeInTheDocument();
    expect(screen.getByText("Incorrect answers: 2")).toBeInTheDocument();
  });

  it("hides Score when the active session is structured", () => {
    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={makeActiveSession({
          config: { totalQuestions: 10, type: "structured" },
        })}
        score={{ fails: 2, successes: 5 }}
      />
    );

    expect(screen.queryByText("Correct answers: 5")).not.toBeInTheDocument();
    expect(screen.queryByText("Incorrect answers: 2")).not.toBeInTheDocument();
  });

  it("shows SessionBanner when the active session is structured", () => {
    const session = makeActiveSession({
      config: { totalQuestions: 20, type: "structured" },
      questionsCompleted: 5,
    });

    render(<TrainingHeader {...defaultProps} activeSession={session} />);

    expect(screen.getByText("Progress: 5/20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("does not show SessionBanner when the active session is open", () => {
    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={makeActiveSession({ config: { type: "open" } })}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Stop" })
    ).not.toBeInTheDocument();
  });

  it("opens settings popover when settings button is clicked", async () => {
    const user = userEvent.setup();

    render(<TrainingHeader {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: "Flashcard settings" })
    );

    expect(screen.getByTestId("settings-content")).toBeInTheDocument();
  });

  it("opens session popover with start controls when session button is clicked", async () => {
    const user = userEvent.setup();

    render(<TrainingHeader {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Start a session" }));

    expect(screen.getByText("Start session:")).toBeInTheDocument();
  });

  it("calls onStopSession when stop button is clicked in session banner", async () => {
    const user = userEvent.setup();
    const handleStopSession = vi.fn();

    render(
      <TrainingHeader
        {...defaultProps}
        activeSession={makeActiveSession({
          config: { totalQuestions: 10, type: "structured" },
        })}
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
      <TrainingHeader {...defaultProps} onStartSession={handleStartSession} />
    );

    // Open session popover first
    await user.click(screen.getByRole("button", { name: "Start a session" }));

    // Mantine Popover dropdown may stay hidden in JSDOM; use hidden option to find the button
    const presetButton = screen.getByRole("button", {
      hidden: true,
      name: "Start 10 question session",
    });
    fireEvent.click(presetButton);

    expect(handleStartSession).toHaveBeenCalledOnce();
    expect(handleStartSession).toHaveBeenCalledWith({
      totalQuestions: 10,
      type: "structured",
    });
  });
  it("moves focus into the settings dropdown on keyboard open and back to the trigger on Escape", async () => {
    stubLayoutRects();
    const user = userEvent.setup();

    render(
      <TrainingHeader
        {...defaultProps}
        settingsContent={<button type="button">Mode option</button>}
      />
    );

    const trigger = screen.getByRole("button", { name: "Flashcard settings" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog", { hidden: true });
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("returns focus to the session trigger after a preset starts a session", async () => {
    stubLayoutRects();
    const user = userEvent.setup();

    render(<TrainingHeader {...defaultProps} />);

    const trigger = screen.getByRole("button", { name: "Start a session" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog", { hidden: true });
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
