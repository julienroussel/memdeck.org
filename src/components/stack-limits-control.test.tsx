import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DECK_SIZE, RANGE_PRESETS } from "../constants";
import { eventBus } from "../services/event-bus";
import { render } from "../test-utils";
import type { StackLimits } from "../types/stack-limits";
import { createDeckPosition } from "../types/stacks";
import { StackLimitsControl } from "./stack-limits-control";

vi.mock("../services/event-bus", () => ({
  eventBus: {
    emit: { STACK_LIMITS_CHANGED: vi.fn() },
    subscribe: {},
  },
}));

const fullLimits: StackLimits = {
  start: createDeckPosition(1),
  end: createDeckPosition(DECK_SIZE),
};

const partialLimits: StackLimits = {
  start: createDeckPosition(5),
  end: createDeckPosition(20),
};

describe("StackLimitsControl", () => {
  it("renders all preset buttons", () => {
    render(
      <StackLimitsControl
        limits={fullLimits}
        onLimitsChange={vi.fn()}
        stackName="Mnemonica"
      />
    );

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
      <StackLimitsControl
        limits={fullLimits}
        onLimitsChange={handleChange}
        stackName="Mnemonica"
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Set range to first 13 cards" })
    );

    expect(handleChange).toHaveBeenCalledWith({
      start: createDeckPosition(1),
      end: createDeckPosition(13),
    });
  });

  it("emits STACK_LIMITS_CHANGED event when a preset button is clicked", () => {
    render(
      <StackLimitsControl
        limits={fullLimits}
        onLimitsChange={vi.fn()}
        stackName="Mnemonica"
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Set range to first 26 cards" })
    );

    expect(eventBus.emit.STACK_LIMITS_CHANGED).toHaveBeenCalledWith({
      start: 1,
      end: 26,
      rangeSize: 26,
      stackName: "Mnemonica",
    });
  });

  it("shows the active preset with filled variant", () => {
    render(
      <StackLimitsControl
        limits={{
          start: createDeckPosition(1),
          end: createDeckPosition(26),
        }}
        onLimitsChange={vi.fn()}
        stackName="Mnemonica"
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
    render(
      <StackLimitsControl
        limits={fullLimits}
        onLimitsChange={vi.fn()}
        stackName="Mnemonica"
      />
    );

    expect(screen.getByText("Full deck (52 cards)")).toBeInTheDocument();
  });

  it("shows partial range description when limits do not span the entire deck", () => {
    render(
      <StackLimitsControl
        limits={partialLimits}
        onLimitsChange={vi.fn()}
        stackName="Mnemonica"
      />
    );

    expect(screen.getByText("Positions 5–20 (16 cards)")).toBeInTheDocument();
  });

  it("calls onLimitsChange and emits event when slider thumb is moved via keyboard", () => {
    const handleChange = vi.fn();

    render(
      <StackLimitsControl
        limits={partialLimits}
        onLimitsChange={handleChange}
        stackName="Mnemonica"
      />
    );

    const startThumb = screen.getByRole("slider", { name: "Start position" });

    // Mantine's RangeSlider fires onChangeEnd on keyUp after an ArrowRight keyDown
    fireEvent.keyDown(startThumb, { key: "ArrowRight" });
    fireEvent.keyUp(startThumb, { key: "ArrowRight" });

    expect(handleChange).toHaveBeenCalledWith({
      start: createDeckPosition(6),
      end: createDeckPosition(20),
    });

    expect(eventBus.emit.STACK_LIMITS_CHANGED).toHaveBeenCalledWith({
      start: 6,
      end: 20,
      rangeSize: 15,
      stackName: "Mnemonica",
    });
  });
});
