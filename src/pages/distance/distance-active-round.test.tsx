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
import type { PlayableDistanceRound } from "./distance-game-reducer";

const promptCard: PlayingCardPosition = {
  card: FourOfClubs,
  index: createDeckPosition(1),
};

const answerCard: PlayingCardPosition = {
  card: TwoOfHearts,
  index: createDeckPosition(2),
};

const cardChoiceA: PlayingCardPosition = {
  card: ThreeOfClubs,
  index: createDeckPosition(3),
};
const cardChoiceB: PlayingCardPosition = {
  card: AceOfSpades,
  index: createDeckPosition(4),
};
const cardChoiceC: PlayingCardPosition = {
  card: FiveOfSpades,
  index: createDeckPosition(5),
};

const computeRound: PlayableDistanceRound = {
  answerCard,
  choices: { data: [1, 2, 3, 4, 5], kind: "numbers" },
  display: "compute",
  expectedDistance: 3,
  offset: null,
};

const applyRound: PlayableDistanceRound = {
  answerCard,
  choices: {
    data: [answerCard, cardChoiceA, cardChoiceB, cardChoiceC, promptCard],
    kind: "cards",
  },
  display: "apply",
  expectedDistance: null,
  offset: 5,
};

const noTimerSettings: TimerSettings = { duration: 30, enabled: false };

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

    await user.click(screen.getByRole("button", { name: "Two of Hearts" }));

    expect(submitAnswer).toHaveBeenCalledWith({
      kind: "apply",
      value: TwoOfHearts,
    });
  });
});
