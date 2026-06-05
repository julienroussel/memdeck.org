import { IconCards } from "@tabler/icons-react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "../constants";
import type {
  UseFeatureDiscoveryOptions,
  UseFeatureDiscoveryResult,
} from "../hooks/use-feature-discovery";
import { render } from "../test-utils";
import { makeSessionRecord } from "../test-utils/session-factories";
import type { FeatureSuggestion } from "../types/discovery";
import { SessionSummarySuggestion } from "./session-summary-suggestion";

const suggestion: FeatureSuggestion = {
  id: "flashcard-neighbor",
  mode: "flashcard",
  isUsed: () => false,
  isApplicable: () => true,
  priority: 2,
  route: ROUTES.flashcard,
  deepLink: { param: "try", value: "neighbor" },
  icon: IconCards,
  i18n: { titleKey: "discovery.flashcardNeighborTitle" },
};

const mockAccept = vi.fn();
const mockDismiss = vi.fn();
let hookValue: UseFeatureDiscoveryResult;
let lastOptions: UseFeatureDiscoveryOptions | undefined;

vi.mock("../hooks/use-feature-discovery", () => ({
  useFeatureDiscovery: (options?: UseFeatureDiscoveryOptions) => {
    lastOptions = options;
    return hookValue;
  },
}));

const mockTrackShown = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackFeatureSuggestionShown: (...args: unknown[]) =>
      mockTrackShown(...args),
  },
}));

const EYEBROW = "Ready for your next challenge?";
const TITLE = "Name the card just before or after the one shown.";

const record = makeSessionRecord({ flashcardMode: "cardonly" });

beforeEach(() => {
  mockAccept.mockReset();
  mockDismiss.mockReset();
  mockTrackShown.mockReset();
  lastOptions = undefined;
  hookValue = {
    nextSuggestion: suggestion,
    accept: mockAccept,
    dismiss: mockDismiss,
    exploredCount: 2,
    totalCount: 13,
  };
});

describe("SessionSummarySuggestion", () => {
  it("renders nothing when there is no eligible suggestion", () => {
    hookValue = { ...hookValue, nextSuggestion: null };

    render(<SessionSummarySuggestion onClose={vi.fn()} record={record} />);

    expect(screen.queryByText(EYEBROW)).not.toBeInTheDocument();
  });

  it("renders the summary eyebrow and the suggestion pitch", () => {
    render(<SessionSummarySuggestion onClose={vi.fn()} record={record} />);

    expect(screen.getByText(EYEBROW)).toBeInTheDocument();
    expect(screen.getByText(TITLE)).toBeInTheDocument();
  });

  it("links the CTA to the same-mode deep-link route", () => {
    render(<SessionSummarySuggestion onClose={vi.fn()} record={record} />);

    expect(screen.getByRole("link", { name: "Try it" })).toHaveAttribute(
      "href",
      "/flashcard/?try=neighbor"
    );
  });

  it("describes the CTA with the suggestion pitch for link purpose", () => {
    render(<SessionSummarySuggestion onClose={vi.fn()} record={record} />);

    const link = screen.getByRole("link", { name: "Try it" });
    const describedBy = link.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByText(TITLE)).toHaveAttribute("id", describedBy);
  });

  it("tracks the suggestion as shown on the summary surface", () => {
    render(<SessionSummarySuggestion onClose={vi.fn()} record={record} />);

    expect(mockTrackShown).toHaveBeenCalledWith(
      "flashcard-neighbor",
      "summary"
    );
  });

  it("accepts on the summary surface and closes the modal when the CTA is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SessionSummarySuggestion onClose={onClose} record={record} />);

    await user.click(screen.getByRole("link", { name: "Try it" }));

    expect(mockAccept).toHaveBeenCalledWith("flashcard-neighbor", "summary");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses the suggestion on the summary surface without closing the modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SessionSummarySuggestion onClose={onClose} record={record} />);

    // The X snoozes the discovery surface (shared with the home card) but leaves
    // the modal open so the user keeps reading their stats.
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(mockDismiss).toHaveBeenCalledWith("flashcard-neighbor", "summary");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("feeds the just-finished record to the discovery hook", () => {
    render(<SessionSummarySuggestion onClose={vi.fn()} record={record} />);

    // #698's same-mode + fresh-usage behavior hinges on the component passing
    // the completed record through to useFeatureDiscovery.
    expect(lastOptions?.completedRecord).toBe(record);
  });
});
