import { Grid } from "@mantine/core";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import {
  createDeckPosition,
  type PlayingCardPosition,
} from "../../types/stacks";
import { FourOfClubs, ThreeOfClubs } from "../../types/suits/clubs";
import { TwoOfHearts } from "../../types/suits/hearts";
import { AceOfSpades, FiveOfSpades } from "../../types/suits/spades";
import type { TimerSettings } from "../../types/timer";
import { DistanceActiveRound } from "./distance-active-round";
import type { DistanceRound } from "./distance-game-reducer";

const promptCard: PlayingCardPosition = {
  index: createDeckPosition(1),
  card: FourOfClubs,
};

const answerCard: PlayingCardPosition = {
  index: createDeckPosition(2),
  card: TwoOfHearts,
};

const cardChoiceA: PlayingCardPosition = {
  index: createDeckPosition(3),
  card: ThreeOfClubs,
};
const cardChoiceB: PlayingCardPosition = {
  index: createDeckPosition(4),
  card: AceOfSpades,
};
const cardChoiceC: PlayingCardPosition = {
  index: createDeckPosition(5),
  card: FiveOfSpades,
};

const computeRound: DistanceRound = {
  display: "compute",
  expectedDistance: 3,
  offset: null,
  answerCard,
  choices: { kind: "numbers", data: [1, 2, 3, 4, 5] },
};

const applyRound: DistanceRound = {
  display: "apply",
  expectedDistance: null,
  offset: 5,
  answerCard,
  choices: {
    kind: "cards",
    data: [answerCard, cardChoiceA, cardChoiceB, cardChoiceC, promptCard],
  },
};

const noTimerSettings: TimerSettings = { enabled: false, duration: 30 };

// DistanceActiveRound emits Grid.Col children, which require a Grid ancestor
// from Mantine. Wrap every render in a Grid so the components mount cleanly.
const renderInGrid = (ui: ReactNode) => render(<Grid>{ui}</Grid>);

describe("DistanceActiveRound — compute round", () => {
  it("renders the compute prompt (both card images visible)", () => {
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={computeRound}
        roundConvention="cyclic"
        submitAnswer={vi.fn()}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );
    // The compute branch of DistancePromptDisplay renders both prompt and
    // target card images with these test ids.
    expect(screen.getByTestId("distance-prompt-card")).toBeInTheDocument();
    expect(screen.getByTestId("distance-target-card")).toBeInTheDocument();
    // No offset badge in compute mode.
    expect(
      screen.queryByTestId("distance-offset-badge")
    ).not.toBeInTheDocument();
  });

  it("clicking a numeric choice calls submitAnswer with kind=compute and the numeric value", async () => {
    const submitAnswer = vi.fn();
    const user = userEvent.setup();
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={computeRound}
        roundConvention="cyclic"
        submitAnswer={submitAnswer}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    // CardSpread labels its number buttons "Select position {n}".
    await user.click(screen.getByRole("button", { name: "Select position 3" }));

    expect(submitAnswer).toHaveBeenCalledWith({ kind: "compute", value: 3 });
  });
});

describe("DistanceActiveRound — apply round", () => {
  it("renders the apply prompt (offset badge visible, no target card image)", () => {
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={applyRound}
        roundConvention="cyclic"
        submitAnswer={vi.fn()}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );
    expect(screen.getByTestId("distance-prompt-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("distance-target-card")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("distance-offset-badge")).toBeInTheDocument();
  });

  it("clicking a card choice calls submitAnswer with kind=apply and the PlayingCard", async () => {
    const submitAnswer = vi.fn();
    const user = userEvent.setup();
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={applyRound}
        roundConvention="cyclic"
        submitAnswer={submitAnswer}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    // CardSpread labels its card buttons with formatCardName(card).
    // Note: there are two buttons matching "2 of Hearts" — the spread button
    // (aria-label) and the inner Image (alt). Use getByRole to disambiguate.
    await user.click(screen.getByRole("button", { name: "2 of Hearts" }));

    expect(submitAnswer).toHaveBeenCalledWith({
      kind: "apply",
      value: TwoOfHearts,
    });
  });
});
