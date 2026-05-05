import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "../../test-utils";
import {
  createDeckPosition,
  type PlayingCardPosition,
} from "../../types/stacks";
import { FourOfClubs } from "../../types/suits/clubs";
import { TwoOfHearts } from "../../types/suits/hearts";
import { DistancePromptDisplay } from "./distance-prompt-display";

const COMPUTE_LABEL_REGEX = /Distance from 4 of Clubs to 2 of Hearts/;
const APPLY_LABEL_REGEX = /Apply offset \+3 to 4 of Clubs/;
const APPLY_OFFSET_5_REGEX = /Apply offset 5 to 4 of Clubs/;

const promptCard: PlayingCardPosition = {
  index: createDeckPosition(1),
  card: FourOfClubs,
};

const targetCard: PlayingCardPosition = {
  index: createDeckPosition(2),
  card: TwoOfHearts,
};

describe("DistancePromptDisplay — compute mode", () => {
  it("renders both card images", () => {
    render(
      <DistancePromptDisplay
        display="compute"
        promptCard={promptCard}
        targetCard={targetCard}
      />
    );
    expect(screen.getByTestId("distance-prompt-card")).toBeInTheDocument();
    expect(screen.getByTestId("distance-target-card")).toBeInTheDocument();
  });

  it("marks the card images decorative (alt='') because the sr-only span announces the prompt", () => {
    render(
      <DistancePromptDisplay
        display="compute"
        promptCard={promptCard}
        targetCard={targetCard}
      />
    );
    // Card images are decorative — the joint compute task description is
    // announced once via a visually-hidden span on the wrapper, so the
    // images carry empty alt to avoid duplicate announcements by AT.
    expect(screen.getByTestId("distance-prompt-card")).toHaveAttribute(
      "alt",
      ""
    );
    expect(screen.getByTestId("distance-target-card")).toHaveAttribute(
      "alt",
      ""
    );
    expect(screen.getByText(COMPUTE_LABEL_REGEX)).toBeInTheDocument();
  });

  it("does not render the offset badge", () => {
    render(
      <DistancePromptDisplay
        display="compute"
        promptCard={promptCard}
        targetCard={targetCard}
      />
    );
    expect(
      screen.queryByTestId("distance-offset-badge")
    ).not.toBeInTheDocument();
  });
});

// offset=null is unreachable — DistanceRound discriminated union enforces offset: number when display === "apply".
describe("DistancePromptDisplay — apply mode", () => {
  it("renders only the prompt card and the offset badge", () => {
    render(
      <DistancePromptDisplay
        convention="cyclic"
        display="apply"
        offset={5}
        promptCard={promptCard}
      />
    );
    expect(screen.getByTestId("distance-prompt-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("distance-target-card")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("distance-offset-badge")).toBeInTheDocument();
  });

  it("marks the prompt card image decorative (alt='') because the sr-only span announces the apply task", () => {
    render(
      <DistancePromptDisplay
        convention="cyclic"
        display="apply"
        offset={5}
        promptCard={promptCard}
      />
    );
    // The image is decorative — the apply task description is announced once
    // via a visually-hidden span so AT doesn't read the card name twice or
    // read the badge's number in isolation.
    expect(screen.getByTestId("distance-prompt-card")).toHaveAttribute(
      "alt",
      ""
    );
    expect(screen.getByText(APPLY_OFFSET_5_REGEX)).toBeInTheDocument();
  });

  it("renders the offset as a bare number under cyclic convention", () => {
    render(
      <DistancePromptDisplay
        convention="cyclic"
        display="apply"
        offset={5}
        promptCard={promptCard}
      />
    );
    expect(screen.getByTestId("distance-offset-badge")).toHaveTextContent("5");
  });

  it("renders positive offset with explicit + sign under signed convention", () => {
    render(
      <DistancePromptDisplay
        convention="signed"
        display="apply"
        offset={5}
        promptCard={promptCard}
      />
    );
    expect(screen.getByTestId("distance-offset-badge")).toHaveTextContent("+5");
  });

  it("renders negative offset with - sign under signed convention", () => {
    render(
      <DistancePromptDisplay
        convention="signed"
        display="apply"
        offset={-3}
        promptCard={promptCard}
      />
    );
    expect(screen.getByTestId("distance-offset-badge")).toHaveTextContent("-3");
  });
});

describe("DistancePromptDisplay — accessibility", () => {
  it("compute mode announces the joint task to assistive tech via a screen-reader-only span", () => {
    render(
      <DistancePromptDisplay
        display="compute"
        promptCard={promptCard}
        targetCard={targetCard}
      />
    );
    expect(screen.getByText(COMPUTE_LABEL_REGEX)).toBeInTheDocument();
  });

  it("apply mode announces the joint task to assistive tech via a screen-reader-only span", () => {
    render(
      <DistancePromptDisplay
        convention="signed"
        display="apply"
        offset={3}
        promptCard={promptCard}
      />
    );
    expect(screen.getByText(APPLY_LABEL_REGEX)).toBeInTheDocument();
  });
});
