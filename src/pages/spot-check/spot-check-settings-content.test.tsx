import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { SpotCheckMode } from "../../types/spot-check";
import type { TimerDuration, TimerSettings } from "../../types/timer";
import { SpotCheckSettingsContent } from "./spot-check-settings-content";

const MISSING_PATTERN = /missing/i;
const SWAPPED_PATTERN = /swapped/i;
const MOVED_PATTERN = /moved/i;

const defaultProps: {
  mode: SpotCheckMode;
  onModeChange: (mode: SpotCheckMode) => void;
  onDurationChange: (duration: TimerDuration) => void;
  onTimerEnabledChange: (enabled: boolean) => void;
  timerSettings: TimerSettings;
} = {
  mode: "missing",
  onModeChange: vi.fn(),
  onDurationChange: vi.fn(),
  onTimerEnabledChange: vi.fn(),
  timerSettings: { enabled: false, duration: 30 },
};

describe("SpotCheckSettingsContent", () => {
  it("renders a radio group for spot check mode selection", () => {
    render(<SpotCheckSettingsContent {...defaultProps} />);

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("renders the TimerSettingsControl with timed mode switch", () => {
    render(<SpotCheckSettingsContent {...defaultProps} />);

    expect(
      screen.getByRole("switch", { name: "Timed mode" })
    ).toBeInTheDocument();
  });

  it("renders a separator between mode selector and timer controls", () => {
    render(<SpotCheckSettingsContent {...defaultProps} />);

    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders all three spot check mode options", () => {
    render(<SpotCheckSettingsContent {...defaultProps} />);

    expect(
      screen.getByRole("radio", { name: MISSING_PATTERN })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: SWAPPED_PATTERN })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: MOVED_PATTERN })
    ).toBeInTheDocument();
  });

  it("selects the mode matching the mode prop", () => {
    render(<SpotCheckSettingsContent {...defaultProps} mode="swapped" />);

    expect(screen.getByRole("radio", { name: SWAPPED_PATTERN })).toBeChecked();
  });

  it("calls onModeChange when a different mode radio is clicked", async () => {
    const onModeChange = vi.fn();
    render(
      <SpotCheckSettingsContent {...defaultProps} onModeChange={onModeChange} />
    );
    await userEvent.click(screen.getByRole("radio", { name: SWAPPED_PATTERN }));
    expect(onModeChange).toHaveBeenCalledWith("swapped");
  });
});
