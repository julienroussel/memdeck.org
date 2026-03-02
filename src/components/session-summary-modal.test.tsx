import { fireEvent, screen } from "@testing-library/react";
import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { makeSummary } from "../test-utils/session-factories";
import { SessionSummaryModal } from "./session-summary-modal";

const t = i18next.t.bind(i18next);

describe("SessionSummaryModal", () => {
  const renderModal = (
    summary: ReturnType<typeof makeSummary>,
    handlers: {
      onDismiss?: () => void;
      onNewSession?: () => void;
    } = {}
  ) => {
    const onDismiss = handlers.onDismiss ?? vi.fn();
    const onNewSession = handlers.onNewSession ?? vi.fn();
    return render(
      <SessionSummaryModal
        onDismiss={onDismiss}
        onNewSession={onNewSession}
        summary={summary}
      />
    );
  };

  describe("modal structure", () => {
    it("renders the session complete title", () => {
      renderModal(makeSummary());

      expect(screen.getByText(t("session.complete"))).toBeInTheDocument();
    });

    it("renders as an open modal", () => {
      renderModal(makeSummary());

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("statistics display", () => {
    const summary = makeSummary({
      record: {
        id: "test",
        mode: "flashcard",
        stackKey: "mnemonica",
        config: { type: "open" },
        startedAt: "2025-01-01T00:00:00.000Z",
        endedAt: "2025-01-01T00:05:00.000Z",
        durationSeconds: 300,
        successes: 8,
        fails: 2,
        questionsCompleted: 10,
        accuracy: 0.8,
        bestStreak: 5,
      },
    });

    it("displays the number of questions completed", () => {
      renderModal(summary);

      expect(screen.getByText(t("common.questions"))).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("displays the correct count", () => {
      renderModal(summary);

      expect(screen.getByText(t("session.correct"))).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("displays the incorrect count", () => {
      renderModal(summary);

      expect(screen.getByText(t("session.incorrect"))).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("displays the accuracy as a percentage", () => {
      renderModal(summary);

      expect(screen.getByText(t("common.accuracy"))).toBeInTheDocument();
      expect(screen.getByText("80%")).toBeInTheDocument();
    });

    it("displays the best streak", () => {
      renderModal(summary);

      expect(screen.getByText(t("common.bestStreak"))).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("displays the duration in formatted form", () => {
      renderModal(summary);

      expect(screen.getByText(t("common.duration"))).toBeInTheDocument();
      // 300 seconds = 5 minutes 0 seconds
      expect(screen.getByText("5m 0s")).toBeInTheDocument();
    });

    it("formats short durations correctly (under 1 minute)", () => {
      const shortSession = makeSummary({
        record: {
          id: "test",
          mode: "flashcard",
          stackKey: "mnemonica",
          config: { type: "open" },
          startedAt: "2025-01-01T00:00:00.000Z",
          endedAt: "2025-01-01T00:00:45.000Z",
          durationSeconds: 45,
          successes: 3,
          fails: 1,
          questionsCompleted: 4,
          accuracy: 0.75,
          bestStreak: 2,
        },
      });

      renderModal(shortSession);

      expect(screen.getByText("45s")).toBeInTheDocument();
    });

    it("displays 100% accuracy when all answers are correct", () => {
      const perfectSession = makeSummary({
        record: {
          id: "test",
          mode: "flashcard",
          stackKey: "mnemonica",
          config: { type: "open" },
          startedAt: "2025-01-01T00:00:00.000Z",
          endedAt: "2025-01-01T00:01:00.000Z",
          durationSeconds: 60,
          successes: 10,
          fails: 0,
          questionsCompleted: 10,
          accuracy: 1.0,
          bestStreak: 10,
        },
      });

      renderModal(perfectSession);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("encouragement message", () => {
    it("displays the encouragement message for consistent performance", () => {
      renderModal(
        makeSummary({
          encouragement: { key: "session.encouragement.consistent" },
        })
      );

      expect(
        screen.getByText(t("session.encouragement.consistent"))
      ).toBeInTheDocument();
    });

    it("displays the encouragement message for a perfect session", () => {
      renderModal(
        makeSummary({
          encouragement: { key: "session.encouragement.perfect" },
        })
      );

      expect(
        screen.getByText(t("session.encouragement.perfect"))
      ).toBeInTheDocument();
    });

    it("displays the encouragement message for improvement", () => {
      renderModal(
        makeSummary({
          encouragement: { key: "session.encouragement.improvement" },
          isAccuracyImprovement: true,
        })
      );

      expect(
        screen.getByText(t("session.encouragement.improvement"))
      ).toBeInTheDocument();
    });

    it("displays the new best streak encouragement with the count", () => {
      renderModal(
        makeSummary({
          encouragement: {
            key: "session.encouragement.newBestStreak",
            params: { count: 12 },
          },
        })
      );

      expect(
        screen.getByText(
          t("session.encouragement.newBestStreak", { count: 12 })
        )
      ).toBeInTheDocument();
    });
  });

  describe("previous average accuracy", () => {
    it("does not render the previous accuracy section when previousAverageAccuracy is null", () => {
      renderModal(makeSummary({ previousAverageAccuracy: null }));

      expect(
        screen.queryByText(t("session.previousAvg"))
      ).not.toBeInTheDocument();
    });

    it("renders the previous accuracy section when previousAverageAccuracy is provided", () => {
      renderModal(makeSummary({ previousAverageAccuracy: 0.75 }));

      expect(screen.getByText(t("session.previousAvg"))).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("renders the previous accuracy badge when accuracy has improved", () => {
      renderModal(
        makeSummary({
          previousAverageAccuracy: 0.6,
          isAccuracyImprovement: true,
        })
      );

      expect(screen.getByText("60%")).toBeInTheDocument();
    });

    it("renders the previous accuracy badge when accuracy has not improved", () => {
      renderModal(
        makeSummary({
          previousAverageAccuracy: 0.85,
          isAccuracyImprovement: false,
        })
      );

      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("renders previous accuracy of 0% correctly", () => {
      renderModal(
        makeSummary({
          previousAverageAccuracy: 0,
          isAccuracyImprovement: true,
        })
      );

      expect(screen.getByText(t("session.previousAvg"))).toBeInTheDocument();
      // accuracy 0 = 0%
      const badges = screen.getAllByText("0%");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("button interactions", () => {
    it("calls onNewSession when the New Session button is clicked", () => {
      const handleNewSession = vi.fn();
      renderModal(makeSummary(), { onNewSession: handleNewSession });

      const newSessionButton = screen.getByRole("button", {
        name: t("common.newSession"),
      });
      fireEvent.click(newSessionButton);

      expect(handleNewSession).toHaveBeenCalledOnce();
    });

    it("calls onDismiss when the Done button is clicked", () => {
      const handleDismiss = vi.fn();
      renderModal(makeSummary(), { onDismiss: handleDismiss });

      const doneButton = screen.getByRole("button", { name: t("common.done") });
      fireEvent.click(doneButton);

      expect(handleDismiss).toHaveBeenCalledOnce();
    });

    it("does not call onNewSession when the Done button is clicked", () => {
      const handleNewSession = vi.fn();
      renderModal(makeSummary(), { onNewSession: handleNewSession });

      const doneButton = screen.getByRole("button", { name: t("common.done") });
      fireEvent.click(doneButton);

      expect(handleNewSession).not.toHaveBeenCalled();
    });

    it("does not call onDismiss when the New Session button is clicked", () => {
      const handleDismiss = vi.fn();
      renderModal(makeSummary(), { onDismiss: handleDismiss });

      const newSessionButton = screen.getByRole("button", {
        name: t("common.newSession"),
      });
      fireEvent.click(newSessionButton);

      expect(handleDismiss).not.toHaveBeenCalled();
    });

    it("renders both action buttons", () => {
      renderModal(makeSummary());

      expect(
        screen.getByRole("button", { name: t("common.newSession") })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: t("common.done") })
      ).toBeInTheDocument();
    });
  });
});
