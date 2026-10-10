import { Grid, Space } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { TimerDisplay } from "../../components/timer-display";
import type { DistanceConvention } from "../../types/distance";
import type { PlayingCard } from "../../types/playingcard";
import type { PlayingCardPosition } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import { cardItems, numberItems } from "../../types/typeguards";
import type {
  DistanceAnswer,
  PlayableDistanceRound,
} from "./distance-game-reducer";
import { DistancePromptDisplay } from "./distance-prompt-display";

type DistanceActiveRoundProps = {
  card: PlayingCardPosition;
  round: PlayableDistanceRound;
  roundConvention: DistanceConvention;
  submitAnswer: (answer: DistanceAnswer) => void;
  timerSettings: TimerSettings;
  timeRemaining: number;
  timerDuration: number;
};

type Announcement = { id: number; text: string };

export const DistanceActiveRound = ({
  card,
  round,
  roundConvention,
  submitAnswer,
  timerSettings,
  timeRemaining,
  timerDuration,
}: DistanceActiveRoundProps) => {
  const { t } = useTranslation();
  const [announcement, setAnnouncement] = useState<Announcement>({
    id: 0,
    text: "",
  });

  const announce = useCallback((text: string) => {
    setAnnouncement((prev) => ({ id: prev.id + 1, text }));
  }, []);

  // A wrong pick does not advance the round, so the announcement must not
  // reveal the answer: it mirrors the visible "Wrong answer / Try again!" toast.
  const wrongAnswerText = `${t("common.wrongAnswerTitle")}. ${t("common.wrongAnswerMessage")}`;

  // Depend on the fields the handlers read, not on `round`: the timer TICK
  // creates a new `round` object every second, which would otherwise give the
  // handlers a new identity per tick and re-render CardSpread.
  const { display, expectedDistance, answerCard } = round;

  const handleNumberClick = useCallback(
    (value: number) => {
      if (display === "compute") {
        const correct = value === expectedDistance;
        announce(correct ? t("distance.answerCorrect") : wrongAnswerText);
      }
      submitAnswer({ kind: "compute", value });
    },
    [submitAnswer, display, expectedDistance, announce, t, wrongAnswerText]
  );

  const handleCardClick = useCallback(
    (value: PlayingCard) => {
      if (display === "apply") {
        const correct =
          value.suit === answerCard.card.suit &&
          value.rank === answerCard.card.rank;
        announce(correct ? t("distance.answerCorrect") : wrongAnswerText);
      }
      submitAnswer({ kind: "apply", value });
    },
    [submitAnswer, display, answerCard, announce, t, wrongAnswerText]
  );

  const numberChoices = useMemo(
    () =>
      numberItems(round.choices.kind === "numbers" ? round.choices.data : []),
    [round.choices]
  );
  const cardChoices = useMemo(
    () =>
      cardItems(
        round.choices.kind === "cards"
          ? round.choices.data.map((c) => c.card)
          : []
      ),
    [round.choices]
  );

  return (
    <>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement.text}
        {announcement.id % 2 === 1 ? "​" : ""}
      </span>
      <Grid.Col span={12}>
        <Space h="xl" />
        {timerSettings.enabled ? (
          <TimerDisplay
            timeRemaining={timeRemaining}
            timerDuration={timerDuration}
          />
        ) : null}
        {round.display === "compute" ? (
          <DistancePromptDisplay
            display="compute"
            promptCard={card}
            targetCard={round.answerCard}
          />
        ) : (
          <DistancePromptDisplay
            convention={roundConvention}
            display="apply"
            offset={round.offset}
            promptCard={card}
          />
        )}
        <Space h="xl" />
      </Grid.Col>
      <Grid.Col span={12} style={{ height: "100%" }}>
        {round.choices.kind === "numbers" ? (
          <CardSpread
            canMove={false}
            hasCursor={true}
            items={numberChoices}
            numberLabel="distance"
            onItemClick={handleNumberClick}
          />
        ) : (
          <CardSpread
            canMove={false}
            hasCursor={true}
            items={cardChoices}
            onItemClick={handleCardClick}
          />
        )}
      </Grid.Col>
    </>
  );
};
