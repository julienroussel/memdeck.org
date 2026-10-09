import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DECK_SIZE, RANGE_PRESETS } from "../constants";
import { render } from "../test-utils";
import type { StackLimits } from "../types/stack-limits";
import { createDeckPosition } from "../types/stacks";
import { StackLimitsControl } from "./stack-limits-control";

const fullLimits: StackLimits = {
  end: createDeckPosition(DECK_SIZE),
  start: createDeckPosition(1),
};

const partialLimits: StackLimits = {
  end: createDeckPosition(20),
  start: createDeckPosition(5),
};

describe("StackLimitsControl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all preset buttons", () => {
    render(<StackLimitsControl limits={fullLimits} onLimitsChange={vi.fn()} />);

    for (const preset of RANGE_PRESETS) {
      expect(
        screen.getByRole("button", {
          name: `Set range to first ${preset} cards`,
        })
      ).toBeInTheDocument();
    }
  });

  it("calls onLimitsChange with correct values when a preset button is clicked", () => {
    const handleChange = vi.fn();

    render(
      <StackLimitsControl limits={fullLimits} onLimitsChange={handleChange} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Set range to first 13 cards" })
    );

    expect(handleChange).toHaveBeenCalledWith({
      end: createDeckPosition(13),
      start: createDeckPosition(1),
    });
  });

  it("shows the active preset with filled variant", () => {
    render(
      <StackLimitsControl
        limits={{
          end: createDeckPosition(26),
          start: createDeckPosition(1),
        }}
        onLimitsChange={vi.fn()}
      />
    );

    const button26 = screen.getByRole("button", {
      name: "Set range to first 26 cards",
    });
    const button13 = screen.getByRole("button", {
      name: "Set range to first 13 cards",
    });

    // Mantine Button does not support aria-pressed; data-variant is the closest
    // observable indicator of active state. Revisit if Mantine adds aria-pressed.
    expect(button26).toHaveAttribute("data-variant", "filled");
    expect(button13).toHaveAttribute("data-variant", "light");
  });

  it("shows full deck description when limits span the entire deck", () => {
    render(<StackLimitsControl limits={fullLimits} onLimitsChange={vi.fn()} />);

    expect(screen.getByText("Full deck (52 cards)")).toBeInTheDocument();
  });

  it("shows partial range description when limits do not span the entire deck", () => {
    render(
      <StackLimitsControl limits={partialLimits} onLimitsChange={vi.fn()} />
    );

    expect(screen.getByText("Positions 5–20 (16 cards)")).toBeInTheDocument();
  });

  it("calls onLimitsChange when slider thumb is moved via keyboard", () => {
    const handleChange = vi.fn();

    render(
      <StackLimitsControl
        limits={partialLimits}
        onLimitsChange={handleChange}
      />
    );

    const startThumb = screen.getByRole("slider", { name: "Start position" });

    // Mantine's RangeSlider fires onChangeEnd on keyUp after an ArrowRight keyDown
    fireEvent.keyDown(startThumb, { key: "ArrowRight" });
    fireEvent.keyUp(startThumb, { key: "ArrowRight" });

    expect(handleChange).toHaveBeenCalledWith({
      end: createDeckPosition(20),
      start: createDeckPosition(6),
    });
  });

  it("shows the persisted limits again when a keyboard change is refused", () => {
    // A refused or failed write leaves `limits` unchanged, so no new props
    // arrive. Mantine fires onChange and onChangeEnd together on keyDown.
    render(
      <StackLimitsControl limits={partialLimits} onLimitsChange={vi.fn()} />
    );

    const startThumb = screen.getByRole("slider", { name: "Start position" });
    fireEvent.keyDown(startThumb, { key: "ArrowRight" });

    expect(startThumb).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByText("Positions 5–20 (16 cards)")).toBeInTheDocument();
  });

  it("shows the dragged range during a pointer drag and the persisted limits once a refused write ends it", async () => {
    // happy-dom has no layout; useMove ignores moves on a zero-size track.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ height: 10, width: 510, x: 0, y: 0 })
    );
    const handleChange = vi.fn();
    render(
      <StackLimitsControl
        limits={partialLimits}
        onLimitsChange={handleChange}
      />
    );

    const startThumb = screen.getByRole("slider", { name: "Start position" });
    fireEvent.mouseDown(startThumb, { clientX: 40 });
    fireEvent.mouseMove(document, { clientX: 90 });

    await waitFor(() => {
      expect(startThumb).toHaveAttribute("aria-valuenow", "10");
    });
    expect(screen.getByText("Positions 10–20 (11 cards)")).toBeInTheDocument();

    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith({
        end: createDeckPosition(20),
        start: createDeckPosition(10),
      });
    });
    expect(startThumb).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByText("Positions 5–20 (16 cards)")).toBeInTheDocument();
  });
});
