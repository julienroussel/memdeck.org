import { IconCards } from "@tabler/icons-react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "../constants";
import type { UseFeatureDiscoveryResult } from "../hooks/use-feature-discovery";
import { render } from "../test-utils";
import type { FeatureSuggestion } from "../types/discovery";
import { NextChallengeCard } from "./next-challenge-card";

const suggestion: FeatureSuggestion = {
  id: "spotcheck-swapped",
  mode: "spotcheck",
  isUsed: () => false,
  isApplicable: () => true,
  priority: 2,
  route: ROUTES.spotCheck,
  deepLink: { param: "try", value: "swapped" },
  icon: IconCards,
  i18n: { titleKey: "discovery.spotCheckSwappedTitle" },
};

const mockAccept = vi.fn();
const mockDismiss = vi.fn();
let hookValue: UseFeatureDiscoveryResult;

vi.mock("../hooks/use-feature-discovery", () => ({
  useFeatureDiscovery: () => hookValue,
}));

const mockTrackShown = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackFeatureSuggestionShown: (...args: unknown[]) =>
      mockTrackShown(...args),
  },
}));

const EYEBROW = "New challenge";
const TITLE = "Two cards trade places — can you catch the swap?";

beforeEach(() => {
  mockAccept.mockReset();
  mockDismiss.mockReset();
  mockTrackShown.mockReset();
  hookValue = {
    nextSuggestion: suggestion,
    accept: mockAccept,
    dismiss: mockDismiss,
    exploredCount: 2,
    totalCount: 9,
  };
});

describe("NextChallengeCard", () => {
  it("renders nothing when there is no suggestion", () => {
    hookValue = { ...hookValue, nextSuggestion: null };

    render(<NextChallengeCard surface="home" />);

    expect(screen.queryByText(EYEBROW)).not.toBeInTheDocument();
  });

  it("renders the eyebrow, suggestion title and progress hint", () => {
    render(<NextChallengeCard surface="home" />);

    expect(screen.getByText(EYEBROW)).toBeInTheDocument();
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.getByText("2 of 9 explored")).toBeInTheDocument();
  });

  it("exposes the card as a region landmark labelled by the eyebrow", () => {
    render(<NextChallengeCard surface="home" />);

    expect(screen.getByRole("region", { name: EYEBROW })).toBeInTheDocument();
  });

  it("links the CTA to the deep-linked route", () => {
    render(<NextChallengeCard surface="home" />);

    expect(screen.getByRole("link", { name: "Try it" })).toHaveAttribute(
      "href",
      "/spot-check/?try=swapped"
    );
  });

  it("describes the CTA with the suggestion title for link purpose", () => {
    render(<NextChallengeCard surface="home" />);

    const link = screen.getByRole("link", { name: "Try it" });
    const describedBy = link.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    // The visible name stays the generic "Try it" (no Label-in-Name break);
    // the destination is conveyed via the associated title.
    expect(screen.getByText(TITLE)).toHaveAttribute("id", describedBy);
  });

  it("tracks the suggestion as shown on mount", () => {
    render(<NextChallengeCard surface="home" />);

    expect(mockTrackShown).toHaveBeenCalledWith("spotcheck-swapped", "home");
  });

  it("accepts the suggestion when the CTA is clicked", async () => {
    const user = userEvent.setup();
    render(<NextChallengeCard surface="home" />);

    await user.click(screen.getByRole("link", { name: "Try it" }));

    expect(mockAccept).toHaveBeenCalledWith("spotcheck-swapped", "home");
  });

  it("dismisses the suggestion when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<NextChallengeCard surface="home" />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(mockDismiss).toHaveBeenCalledWith("spotcheck-swapped", "home");
  });
});
