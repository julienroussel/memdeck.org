import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { SESSION_PRESETS } from "../types/session";
import { SessionStartControls } from "./session-start-controls";

const getPresetButton = (value: number) =>
  screen.getByRole("button", {
    name: `Start ${value} question session`,
  });

const queryPresetButton = (value: number) =>
  screen.queryByRole("button", {
    name: `Start ${value} question session`,
  });

describe("SessionStartControls", () => {
  it("shows all standard presets when rangeSize is 52", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={52} />);

    for (const preset of SESSION_PRESETS) {
      expect(getPresetButton(preset)).toBeInTheDocument();
    }
  });

  it("filters presets that exceed the rangeSize", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={20} />);

    expect(getPresetButton(10)).toBeInTheDocument();
    expect(queryPresetButton(30)).not.toBeInTheDocument();
    expect(queryPresetButton(52)).not.toBeInTheDocument();
  });

  it("appends rangeSize as a custom preset when it does not match a standard preset", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={15} />);

    // 10 from SESSION_PRESETS fits, plus 15 appended
    expect(getPresetButton(10)).toBeInTheDocument();
    expect(getPresetButton(15)).toBeInTheDocument();
  });

  it("does not duplicate rangeSize when it matches a standard preset", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={10} />);

    const buttons = screen.getAllByRole("button", {
      name: "Start 10 question session",
    });
    expect(buttons).toHaveLength(1);
  });

  it("shows rangeSize as the only preset when it is smaller than the smallest standard preset", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={6} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("6");
  });

  it("defaults to 52 when rangeSize is not provided", () => {
    render(<SessionStartControls onStart={vi.fn()} />);

    for (const preset of SESSION_PRESETS) {
      expect(getPresetButton(preset)).toBeInTheDocument();
    }
  });

  it("calls onStart with a structured config when a preset is clicked", async () => {
    const user = userEvent.setup();
    const handleStart = vi.fn();

    render(<SessionStartControls onStart={handleStart} rangeSize={52} />);

    await user.click(getPresetButton(20));

    expect(handleStart).toHaveBeenCalledWith({
      type: "structured",
      totalQuestions: 20,
    });
  });

  it("treats rangeSize of 0 as 1", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={0} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("1");
  });

  it("calls onAfterStart after onStart when provided", async () => {
    const user = userEvent.setup();
    const callOrder: string[] = [];
    const handleStart = vi.fn(() => callOrder.push("start"));
    const handleAfterStart = vi.fn(() => callOrder.push("afterStart"));

    render(
      <SessionStartControls
        onAfterStart={handleAfterStart}
        onStart={handleStart}
        rangeSize={52}
      />
    );

    await user.click(getPresetButton(10));

    expect(handleStart).toHaveBeenCalledTimes(1);
    expect(handleAfterStart).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["start", "afterStart"]);
  });
});
