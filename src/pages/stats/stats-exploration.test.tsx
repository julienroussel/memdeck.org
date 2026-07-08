import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseFeatureDiscoveryResult } from "../../hooks/use-feature-discovery";
import { render } from "../../test-utils";
import { makeSessionRecord } from "../../test-utils/session-factories";
import { StatsExploration } from "./stats-exploration";

// Hoisted to module scope per Biome's useTopLevelRegex rule.
const POSITION_ALONE = /position alone/;
const NEIGHBOR_LINK_NAME = /Not explored:.*before or after/;
const ACAAN_LINK_NAME = /Not explored:.*Any Card At Any Number/;

const mockAccept = vi.fn();
let hookValue: UseFeatureDiscoveryResult;

// Only `accept` is consumed; the component derives usage/exploredCount itself.
vi.mock("../../hooks/use-feature-discovery", () => ({
  useFeatureDiscovery: () => hookValue,
}));

// A single untimed flashcard "number-only" session marks exactly ONE catalog
// item used: `flashcard-numberonly`. (There is no flashcard whole-mode tile, and
// the session is untimed, so nothing else flips.)
const numberOnlyHistory = [
  makeSessionRecord({
    flashcardMode: "numberonly",
    id: "s1",
    mode: "flashcard",
  }),
];

beforeEach(() => {
  mockAccept.mockReset();
  hookValue = {
    accept: mockAccept,
    dismiss: vi.fn(),
    exploredCount: 0,
    nextSuggestion: null,
    totalCount: 13,
  };
});

describe("StatsExploration", () => {
  it("shows the explored count derived from session history", () => {
    render(<StatsExploration history={numberOnlyHistory} />);

    expect(screen.getByText("1 of 13 explored")).toBeInTheDocument();
  });

  it("marks a completed item explored and not tappable", () => {
    render(<StatsExploration history={numberOnlyHistory} />);

    // flashcard-numberonly is completed → explored status, static (not a link).
    expect(screen.getByText("Explored:")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: POSITION_ALONE })
    ).not.toBeInTheDocument();
    // …but its pitch is still shown as text.
    expect(screen.getByText(POSITION_ALONE)).toBeInTheDocument();
  });

  it("renders untried items as deep-linked, tappable rows", () => {
    render(<StatsExploration history={numberOnlyHistory} />);

    // A sub-variant deep-links with ?try=; a whole mode links to the bare route.
    expect(
      screen.getByRole("link", { name: NEIGHBOR_LINK_NAME })
    ).toHaveAttribute("href", "/flashcard/?try=neighbor");
    expect(screen.getByRole("link", { name: ACAAN_LINK_NAME })).toHaveAttribute(
      "href",
      "/acaan/"
    );
  });

  it("routes a tap through accept(id, 'stats')", async () => {
    const user = userEvent.setup();
    render(<StatsExploration history={numberOnlyHistory} />);

    await user.click(screen.getByRole("link", { name: NEIGHBOR_LINK_NAME }));

    expect(mockAccept).toHaveBeenCalledWith("flashcard-neighbor", "stats");
  });

  it("shows the full 13-item map for a user with zero explored items", () => {
    // Position-only flashcard: `hasData` is true upstream, but no catalog item
    // is completed (no flashcard whole-mode tile). The map must still render —
    // it's exactly the user it should motivate — never gated behind exploredCount.
    render(
      <StatsExploration
        history={[
          makeSessionRecord({
            flashcardMode: "cardonly",
            id: "s1",
            mode: "flashcard",
          }),
        ]}
      />
    );

    expect(screen.getByText("0 of 13 explored")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(13);
  });

  it("marks every item explored with no tappable rows when all 13 are tried", () => {
    // Ceiling boundary: six sessions that flip all 13 catalog items (every mode,
    // sub-variant, and a timed session per mode). The header hits "13 of 13" and
    // every row is static — the only state with zero links.
    render(
      <StatsExploration
        history={[
          makeSessionRecord({
            flashcardMode: "numberonly",
            id: "f1",
            mode: "flashcard",
            timed: true,
          }),
          makeSessionRecord({
            flashcardMode: "neighbor",
            id: "f2",
            mode: "flashcard",
          }),
          makeSessionRecord({
            id: "s1",
            mode: "spotcheck",
            spotCheckMode: "swapped",
            timed: true,
          }),
          makeSessionRecord({
            id: "s2",
            mode: "spotcheck",
            spotCheckMode: "moved",
          }),
          makeSessionRecord({
            distanceConvention: "signed",
            distanceMode: "apply",
            id: "d1",
            mode: "distance",
            timed: true,
          }),
          makeSessionRecord({ id: "a1", mode: "acaan", timed: true }),
        ]}
      />
    );

    expect(screen.getByText("13 of 13 explored")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("groups items under their mode headings", () => {
    render(<StatsExploration history={[]} />);

    expect(
      screen.getByRole("heading", { name: "Flashcard" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Spot Check" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Distance" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ACAAN" })).toBeInTheDocument();
  });
});
