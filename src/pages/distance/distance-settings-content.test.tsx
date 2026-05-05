import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { DistanceConvention, DistanceMode } from "../../types/distance";
import type { TimerSettings } from "../../types/timer";
import { DistanceSettingsContent } from "./distance-settings-content";

const defaultTimerSettings: TimerSettings = { enabled: false, duration: 15 };

const MODE_LABEL_REGEX = /Distance mode/i;
const CONVENTION_LABEL_REGEX = /Distance convention/i;
const TIMED_MODE_LABEL_REGEX = /Timed mode/i;

const renderControl = (
  overrides: Partial<{
    onModeChange: (m: DistanceMode) => void;
    onConventionChange: (c: DistanceConvention) => void;
    onDurationChange: () => void;
    onTimerEnabledChange: (e: boolean) => void;
  }> = {}
) => {
  const props = {
    mode: "both" as const,
    convention: "cyclic" as const,
    timerSettings: defaultTimerSettings,
    onModeChange: vi.fn(),
    onConventionChange: vi.fn(),
    onDurationChange: vi.fn(),
    onTimerEnabledChange: vi.fn(),
    ...overrides,
  };
  render(<DistanceSettingsContent {...props} />);
  return props;
};

describe("DistanceSettingsContent", () => {
  it("renders all three mode options", () => {
    renderControl();
    expect(screen.getByLabelText(MODE_LABEL_REGEX)).toBeInTheDocument();
    expect(screen.getByText("Compute")).toBeInTheDocument();
    expect(screen.getByText("Apply")).toBeInTheDocument();
    expect(screen.getByText("Both")).toBeInTheDocument();
  });

  it("renders both convention options", () => {
    renderControl();
    expect(screen.getByLabelText(CONVENTION_LABEL_REGEX)).toBeInTheDocument();
    expect(screen.getByText("Cyclic")).toBeInTheDocument();
    expect(screen.getByText("Signed")).toBeInTheDocument();
  });

  it("renders the timer toggle", () => {
    renderControl();
    expect(screen.getByLabelText(TIMED_MODE_LABEL_REGEX)).toBeInTheDocument();
  });

  it("calls onModeChange when a mode option is selected", () => {
    const props = renderControl();
    fireEvent.click(screen.getByText("Compute"));
    expect(props.onModeChange).toHaveBeenCalledWith("compute");
  });

  it("calls onConventionChange when a convention option is selected", () => {
    const props = renderControl();
    fireEvent.click(screen.getByText("Signed"));
    expect(props.onConventionChange).toHaveBeenCalledWith("signed");
  });

  it("calls onTimerEnabledChange(true) when toggling the timer Switch from off", () => {
    const props = renderControl({
      // Explicit: starts disabled so the click flips it on.
    });
    const toggle = screen.getByLabelText(TIMED_MODE_LABEL_REGEX);
    fireEvent.click(toggle);
    expect(props.onTimerEnabledChange).toHaveBeenCalledWith(true);
  });

  it("calls onDurationChange when a duration option is selected", () => {
    // The duration SegmentedControl is only mounted when the timer is
    // enabled — render directly rather than through the helper so we can
    // pass an enabled TimerSettings.
    const onDurationChange = vi.fn();
    const enabledTimerSettings: TimerSettings = {
      enabled: true,
      duration: 15,
    };
    render(
      <DistanceSettingsContent
        convention="cyclic"
        mode="both"
        onConventionChange={vi.fn()}
        onDurationChange={onDurationChange}
        onModeChange={vi.fn()}
        onTimerEnabledChange={vi.fn()}
        timerSettings={enabledTimerSettings}
      />
    );
    fireEvent.click(screen.getByText("30s"));
    expect(onDurationChange).toHaveBeenCalledWith(30);
  });
});
