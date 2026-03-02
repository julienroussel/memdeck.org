import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import type { TimerSettings } from "../types/timer";
import { TimerSettingsControl } from "./timer-settings-control";

const defaultDisabledSettings: TimerSettings = {
  enabled: false,
  duration: 30,
};

const defaultEnabledSettings: TimerSettings = {
  enabled: true,
  duration: 30,
};

describe("TimerSettingsControl", () => {
  describe("initial rendering", () => {
    it("renders the timed mode switch", () => {
      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultDisabledSettings}
        />
      );

      // Mantine Switch renders with role="switch", not role="checkbox"
      expect(
        screen.getByRole("switch", { name: "Timed mode" })
      ).toBeInTheDocument();
    });

    it("renders with the switch unchecked when timer is disabled", () => {
      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultDisabledSettings}
        />
      );

      const toggle = screen.getByRole("switch", { name: "Timed mode" });
      expect(toggle).not.toBeChecked();
    });

    it("renders with the switch checked when timer is enabled", () => {
      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultEnabledSettings}
        />
      );

      const toggle = screen.getByRole("switch", { name: "Timed mode" });
      expect(toggle).toBeChecked();
    });

    it("does not render the duration control when timer is disabled", () => {
      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultDisabledSettings}
        />
      );

      expect(screen.queryByText("Time limit:")).not.toBeInTheDocument();
    });

    it("renders the duration control when timer is enabled", () => {
      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultEnabledSettings}
        />
      );

      expect(screen.getByText("Time limit:")).toBeInTheDocument();
    });

    it("associates the duration label with the segmented control via aria-labelledby", () => {
      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultEnabledSettings}
        />
      );

      const label = screen.getByText("Time limit:");
      expect(label).toHaveAttribute("id");

      const radiogroup = screen.getByRole("radiogroup");
      expect(radiogroup).toHaveAttribute("aria-labelledby", label.id);
    });

    it("renders all three duration options when timer is enabled", () => {
      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultEnabledSettings}
        />
      );

      expect(screen.getByRole("radio", { name: "10s" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "15s" })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "30s" })).toBeInTheDocument();
    });

    it("reflects the currently selected duration of 15 seconds", () => {
      const settings: TimerSettings = { enabled: true, duration: 15 };

      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={settings}
        />
      );

      const option15s = screen.getByRole("radio", { name: "15s" });
      expect(option15s).toBeChecked();
    });

    it("reflects the currently selected duration of 10 seconds", () => {
      const settings: TimerSettings = { enabled: true, duration: 10 };

      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={settings}
        />
      );

      const option10s = screen.getByRole("radio", { name: "10s" });
      expect(option10s).toBeChecked();
    });

    it("reflects the currently selected duration of 30 seconds", () => {
      const settings: TimerSettings = { enabled: true, duration: 30 };

      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={settings}
        />
      );

      const option30s = screen.getByRole("radio", { name: "30s" });
      expect(option30s).toBeChecked();
    });
  });

  describe("toggle on/off", () => {
    it("calls onEnabledChange with true when the switch is turned on", () => {
      const handleEnabledChange = vi.fn();

      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={handleEnabledChange}
          timerSettings={defaultDisabledSettings}
        />
      );

      const toggle = screen.getByRole("switch", { name: "Timed mode" });
      fireEvent.click(toggle);

      expect(handleEnabledChange).toHaveBeenCalledWith(true);
    });

    it("calls onEnabledChange with false when the switch is turned off", () => {
      const handleEnabledChange = vi.fn();

      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={handleEnabledChange}
          timerSettings={defaultEnabledSettings}
        />
      );

      const toggle = screen.getByRole("switch", { name: "Timed mode" });
      fireEvent.click(toggle);

      expect(handleEnabledChange).toHaveBeenCalledWith(false);
    });

    it("calls onEnabledChange exactly once when clicked", () => {
      const handleEnabledChange = vi.fn();

      render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={handleEnabledChange}
          timerSettings={defaultDisabledSettings}
        />
      );

      const toggle = screen.getByRole("switch", { name: "Timed mode" });
      fireEvent.click(toggle);

      expect(handleEnabledChange).toHaveBeenCalledOnce();
    });
  });

  describe("duration change", () => {
    it("calls onDurationChange with 10 when the 10s option is selected", () => {
      const handleDurationChange = vi.fn();
      // Start with 15s selected so clicking 10s fires the change event
      const settings: TimerSettings = { enabled: true, duration: 15 };

      render(
        <TimerSettingsControl
          onDurationChange={handleDurationChange}
          onEnabledChange={vi.fn()}
          timerSettings={settings}
        />
      );

      const option10s = screen.getByRole("radio", { name: "10s" });
      fireEvent.click(option10s);

      expect(handleDurationChange).toHaveBeenCalledWith(10);
    });

    it("calls onDurationChange with 15 when the 15s option is selected", () => {
      const handleDurationChange = vi.fn();
      // Start with 30s selected so clicking 15s fires the change event
      const settings: TimerSettings = { enabled: true, duration: 30 };

      render(
        <TimerSettingsControl
          onDurationChange={handleDurationChange}
          onEnabledChange={vi.fn()}
          timerSettings={settings}
        />
      );

      const option15s = screen.getByRole("radio", { name: "15s" });
      fireEvent.click(option15s);

      expect(handleDurationChange).toHaveBeenCalledWith(15);
    });

    it("calls onDurationChange with 30 when the 30s option is selected", () => {
      const handleDurationChange = vi.fn();
      // Start with 10s selected so clicking 30s fires the change event
      const settings: TimerSettings = { enabled: true, duration: 10 };

      render(
        <TimerSettingsControl
          onDurationChange={handleDurationChange}
          onEnabledChange={vi.fn()}
          timerSettings={settings}
        />
      );

      const option30s = screen.getByRole("radio", { name: "30s" });
      fireEvent.click(option30s);

      expect(handleDurationChange).toHaveBeenCalledWith(30);
    });

    it("does not call onDurationChange when the already-selected option is re-clicked", () => {
      const handleDurationChange = vi.fn();
      const settings: TimerSettings = { enabled: true, duration: 30 };

      render(
        <TimerSettingsControl
          onDurationChange={handleDurationChange}
          onEnabledChange={vi.fn()}
          timerSettings={settings}
        />
      );

      // Click the already-selected 30s option — SegmentedControl skips onChange
      const option30s = screen.getByRole("radio", { name: "30s" });
      fireEvent.click(option30s);

      expect(handleDurationChange).not.toHaveBeenCalled();
    });
  });

  describe("conditional rendering of duration control", () => {
    it("hides the duration options when the timer is toggled off via props update", () => {
      const { rerender } = render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultEnabledSettings}
        />
      );

      expect(screen.getByText("Time limit:")).toBeInTheDocument();

      rerender(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultDisabledSettings}
        />
      );

      expect(screen.queryByText("Time limit:")).not.toBeInTheDocument();
    });

    it("shows the duration options when the timer is toggled on via props update", () => {
      const { rerender } = render(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultDisabledSettings}
        />
      );

      expect(screen.queryByText("Time limit:")).not.toBeInTheDocument();

      rerender(
        <TimerSettingsControl
          onDurationChange={vi.fn()}
          onEnabledChange={vi.fn()}
          timerSettings={defaultEnabledSettings}
        />
      );

      expect(screen.getByText("Time limit:")).toBeInTheDocument();
    });
  });
});
