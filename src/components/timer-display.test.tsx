import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "../test-utils";
import { TimerDisplay } from "./timer-display";

describe("TimerDisplay", () => {
  describe("time display formatting", () => {
    it("displays the time remaining with seconds suffix", () => {
      render(<TimerDisplay timeRemaining={15} timerDuration={30} />);

      expect(screen.getByText("15s")).toBeInTheDocument();
    });

    it("displays zero seconds remaining", () => {
      render(<TimerDisplay timeRemaining={0} timerDuration={30} />);

      expect(screen.getByText("0s")).toBeInTheDocument();
    });

    it("displays the full duration when no time has elapsed", () => {
      render(<TimerDisplay timeRemaining={30} timerDuration={30} />);

      expect(screen.getByText("30s")).toBeInTheDocument();
    });

    it("displays the time remaining label", () => {
      render(<TimerDisplay timeRemaining={10} timerDuration={30} />);

      expect(screen.getByText("Time remaining")).toBeInTheDocument();
    });

    it("renders 1 second remaining", () => {
      render(<TimerDisplay timeRemaining={1} timerDuration={30} />);

      expect(screen.getByText("1s")).toBeInTheDocument();
    });
  });

  describe("progress bar", () => {
    it("renders a progress bar element", () => {
      render(<TimerDisplay timeRemaining={15} timerDuration={30} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });

    it("progress bar is animated when time is remaining", () => {
      render(<TimerDisplay timeRemaining={10} timerDuration={30} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("data-animated");
    });

    it("progress bar is not animated when time has run out", () => {
      render(<TimerDisplay timeRemaining={0} timerDuration={30} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).not.toHaveAttribute("data-animated");
    });

    it("renders progress bar at full value when no time has elapsed", () => {
      render(<TimerDisplay timeRemaining={30} timerDuration={30} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    });

    it("renders progress bar at zero when time has run out", () => {
      render(<TimerDisplay timeRemaining={0} timerDuration={30} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    });

    it("renders progress bar at 50% when half the time remains", () => {
      render(<TimerDisplay timeRemaining={15} timerDuration={30} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    });

    it("handles zero timerDuration without crashing (prevents division by zero)", () => {
      render(<TimerDisplay timeRemaining={0} timerDuration={0} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    });

    it("has an accessible aria-label with the time remaining", () => {
      render(<TimerDisplay timeRemaining={15} timerDuration={30} />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-label", "Time remaining: 15s");
      expect(progressBar).toHaveAttribute("aria-valuetext", "15s");
    });
  });

  describe("time threshold rendering", () => {
    it("applies a different color at the critical threshold (<=3s) than at the warning threshold (4-5s)", () => {
      const { unmount } = render(
        <TimerDisplay timeRemaining={3} timerDuration={30} />
      );
      const criticalColor = screen
        .getByRole("progressbar")
        .getAttribute("style");
      unmount();

      render(<TimerDisplay timeRemaining={4} timerDuration={30} />);
      const warningColor = screen
        .getByRole("progressbar")
        .getAttribute("style");

      expect(criticalColor).not.toBe(warningColor);
    });

    it("applies a different color at the warning threshold (4-5s) than at the normal threshold (>5s)", () => {
      const { unmount } = render(
        <TimerDisplay timeRemaining={4} timerDuration={30} />
      );
      const warningColor = screen
        .getByRole("progressbar")
        .getAttribute("style");
      unmount();

      render(<TimerDisplay timeRemaining={6} timerDuration={30} />);
      const normalColor = screen.getByRole("progressbar").getAttribute("style");

      expect(warningColor).not.toBe(normalColor);
    });
  });

  describe("assertive live region announcements", () => {
    it("announces time remaining when 5 seconds remain", () => {
      const { container } = render(
        <TimerDisplay timeRemaining={5} timerDuration={30} />
      );

      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toBe("Time remaining: 5s");
    });

    it("announces time remaining when 1 second remains", () => {
      const { container } = render(
        <TimerDisplay timeRemaining={1} timerDuration={30} />
      );

      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toBe("Time remaining: 1s");
    });

    it("does not announce when time remaining is not at an urgent threshold", () => {
      const { container } = render(
        <TimerDisplay timeRemaining={10} timerDuration={30} />
      );

      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toBe("");
    });

    it("does not announce when time remaining is 0", () => {
      const { container } = render(
        <TimerDisplay timeRemaining={0} timerDuration={30} />
      );

      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toBe("");
    });
  });

  describe("edge cases", () => {
    it("renders correctly with very large time values", () => {
      render(<TimerDisplay timeRemaining={9999} timerDuration={9999} />);

      expect(screen.getByText("9999s")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    });

    it("renders correctly when timeRemaining exceeds timerDuration", () => {
      render(<TimerDisplay timeRemaining={40} timerDuration={30} />);

      expect(screen.getByText("40s")).toBeInTheDocument();
    });

    it("renders with different valid duration options (10s)", () => {
      render(<TimerDisplay timeRemaining={5} timerDuration={10} />);

      expect(screen.getByText("5s")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    });

    it("renders with different valid duration options (15s)", () => {
      render(<TimerDisplay timeRemaining={15} timerDuration={15} />);

      expect(screen.getByText("15s")).toBeInTheDocument();
      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    });
  });
});
