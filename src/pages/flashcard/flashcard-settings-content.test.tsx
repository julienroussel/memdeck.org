import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import type { DeckPosition } from "../../types/stacks";
import { createDeckPosition } from "../../types/stacks";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { FlashcardSettingsContent } from "./flashcard-settings-content";

const defaultProps: {
  focusPositions: readonly DeckPosition[];
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  onDirectionChange: (direction: NeighborDirection) => void;
  onFocusPositionsChange: (positions: readonly DeckPosition[]) => void;
  onModeChange: (mode: FlashcardMode) => void;
  onDurationChange: (duration: TimerDuration) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  timerSettings: TimerSettings;
} = {
  focusPositions: [],
  mode: "cardonly",
  neighborDirection: "before",
  onDirectionChange: vi.fn(),
  onDurationChange: vi.fn(),
  onFocusPositionsChange: vi.fn(),
  onModeChange: vi.fn(),
  onTimerEnabledChange: vi.fn(),
  timerSettings: { duration: 30, enabled: false },
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

  it("renders the focus positions field", () => {
    render(<FlashcardSettingsContent {...defaultProps} />);

    expect(
      screen.getByRole("textbox", { name: "Focus positions" })
    ).toBeInTheDocument();
  });

  it("shows the stored list and passes an applied one up", () => {
    const onFocusPositionsChange = vi.fn();
    render(
      <FlashcardSettingsContent
        {...defaultProps}
        focusPositions={[1, 2, 3, 4, 5].map(createDeckPosition)}
        onFocusPositionsChange={onFocusPositionsChange}
      />
    );

    const input = screen.getByRole("textbox", { name: "Focus positions" });
    expect(input).toHaveValue("1-5");
    fireEvent.change(input, { target: { value: "6-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onFocusPositionsChange).toHaveBeenCalledWith([6, 7, 8, 9, 10]);
  });

  it("renders a separator between each settings section", () => {
    render(<FlashcardSettingsContent {...defaultProps} />);

    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });
});
