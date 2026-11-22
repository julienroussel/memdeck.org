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

const getPresetLabels = () =>
  screen.getAllByRole("button").map((button) => button.textContent);

describe("SessionStartControls", () => {
  it("shows exactly the standard presets when rangeSize is 52", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={52} />);

    expect(getPresetLabels()).toEqual(["10", "20", "30", "52"]);
  });

  it("keeps the presets above the rangeSize", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={20} />);

    for (const preset of SESSION_PRESETS) {
      expect(getPresetButton(preset)).toBeInTheDocument();
    }
  });

  it("adds rangeSize in sorted order when it does not match a standard preset", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={17} />);

    expect(getPresetLabels()).toEqual(["10", "17", "20", "30", "52"]);
  });

  it.each([10, 20, 30])(
    "does not duplicate a rangeSize of %i, which matches a standard preset",
    (rangeSize) => {
      render(<SessionStartControls onStart={vi.fn()} rangeSize={rangeSize} />);

      expect(getPresetLabels()).toEqual(["10", "20", "30", "52"]);
    }
  );

  it("adds a rangeSize between 30 and 52 just before 52", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={40} />);

    expect(getPresetLabels()).toEqual(["10", "20", "30", "40", "52"]);
  });

  it("puts rangeSize first when it is smaller than the smallest standard preset", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={6} />);

    expect(getPresetLabels()).toEqual(["6", "10", "20", "30", "52"]);
  });

  it("defaults to 52 when rangeSize is not provided", () => {
    render(<SessionStartControls onStart={vi.fn()} />);

    expect(getPresetLabels()).toEqual(["10", "20", "30", "52"]);
  });

  it("starts a session longer than the range when a preset above it is clicked", async () => {
    const user = userEvent.setup();
    const handleStart = vi.fn();

    render(<SessionStartControls onStart={handleStart} rangeSize={17} />);

    await user.click(getPresetButton(30));

    expect(handleStart).toHaveBeenCalledWith({
      totalQuestions: 30,
      type: "structured",
    });
  });

  it("calls onStart with a structured config when a preset is clicked", async () => {
    const user = userEvent.setup();
    const handleStart = vi.fn();

    render(<SessionStartControls onStart={handleStart} rangeSize={52} />);

    await user.click(getPresetButton(20));

    expect(handleStart).toHaveBeenCalledWith({
      totalQuestions: 20,
      type: "structured",
    });
  });

  it("treats rangeSize of 0 as 1", () => {
    render(<SessionStartControls onStart={vi.fn()} rangeSize={0} />);

    expect(getPresetLabels()).toEqual(["1", "10", "20", "30", "52"]);
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
