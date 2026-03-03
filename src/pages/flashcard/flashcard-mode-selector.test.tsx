import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import { FlashcardModeSelector } from "./flashcard-mode-selector";

const defaultProps: {
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  onModeChange: (mode: FlashcardMode) => void;
  onDirectionChange: (direction: NeighborDirection) => void;
} = {
  mode: "cardonly",
  neighborDirection: "before",
  onModeChange: vi.fn(),
  onDirectionChange: vi.fn(),
};

describe("FlashcardModeSelector", () => {
  it("renders primary mode controls with Position and Neighbor options", () => {
    render(<FlashcardModeSelector {...defaultProps} />);

    expect(
      screen.getByRole("radiogroup", { name: "Training mode" })
    ).toBeInTheDocument();
  });

  it("renders position sub-mode controls when primary mode is a position mode", () => {
    render(<FlashcardModeSelector {...defaultProps} mode="cardonly" />);

    expect(
      screen.getByRole("radiogroup", { name: "Position mode variant" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", { name: "Neighbor direction" })
    ).not.toBeInTheDocument();
  });

  it("renders neighbor direction controls when mode is 'neighbor'", () => {
    render(<FlashcardModeSelector {...defaultProps} mode="neighbor" />);

    expect(
      screen.getByRole("radiogroup", { name: "Neighbor direction" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", { name: "Position mode variant" })
    ).not.toBeInTheDocument();
  });

  it("calls onModeChange with 'neighbor' when switching primary mode to Neighbor", async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FlashcardModeSelector
        {...defaultProps}
        mode="cardonly"
        onModeChange={onModeChange}
      />
    );

    await user.click(screen.getByText("Neighbor"));

    expect(onModeChange).toHaveBeenCalledWith("neighbor");
  });

  it("calls onModeChange with the sub-mode when switching position sub-mode", async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FlashcardModeSelector
        {...defaultProps}
        mode="cardonly"
        onModeChange={onModeChange}
      />
    );

    await user.click(screen.getByText("Number"));

    expect(onModeChange).toHaveBeenCalledWith("numberonly");
  });

  it("calls onDirectionChange when neighbor direction changes", async () => {
    const onDirectionChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FlashcardModeSelector
        {...defaultProps}
        mode="neighbor"
        neighborDirection="before"
        onDirectionChange={onDirectionChange}
      />
    );

    await user.click(screen.getByText("After"));

    expect(onDirectionChange).toHaveBeenCalledWith("after");
  });
});
