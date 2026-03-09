import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { FlashcardSettingsContent } from "./flashcard-settings-content";

const defaultProps: {
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  onDirectionChange: (direction: NeighborDirection) => void;
  onModeChange: (mode: FlashcardMode) => void;
  onDurationChange: (duration: TimerDuration) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  timerSettings: TimerSettings;
} = {
  mode: "cardonly",
  neighborDirection: "before",
  onDirectionChange: vi.fn(),
  onModeChange: vi.fn(),
  onDurationChange: vi.fn(),
  onTimerEnabledChange: vi.fn(),
  timerSettings: { enabled: false, duration: 30 },
};

describe("FlashcardSettingsContent", () => {
  it("renders the FlashcardModeSelector with training mode controls", () => {
    render(<FlashcardSettingsContent {...defaultProps} />);

    expect(
      screen.getByRole("radiogroup", { name: "Training mode" })
    ).toBeInTheDocument();
  });

  it("renders the TimerSettingsControl with timed mode switch", () => {
    render(<FlashcardSettingsContent {...defaultProps} />);

    expect(
      screen.getByRole("switch", { name: "Timed mode" })
    ).toBeInTheDocument();
  });

  it("renders a separator between settings sections", () => {
    render(<FlashcardSettingsContent {...defaultProps} />);

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });
});
