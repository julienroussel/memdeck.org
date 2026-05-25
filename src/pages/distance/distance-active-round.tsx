import { Grid, Space } from "@mantine/core";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { TimerDisplay } from "../../components/timer-display";
import { useFormatCardName } from "../../hooks/use-format-card-name";
import type { DistanceConvention } from "../../types/distance";
import type { PlayingCard } from "../../types/playingcard";
import type { PlayingCardPosition } from "../../types/stacks";
import type { TimerSettings } from "../../types/timer";
import { cardItems, numberItems } from "../../types/typeguards";
import type { DistanceAnswer, DistanceRound } from "./distance-game-reducer";
import { DistancePromptDisplay } from "./distance-prompt-display";

type DistanceActiveRoundProps = {
  card: PlayingCardPosition;
  round: DistanceRound;
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
  const formatCardName = useFormatCardName();
  const [announcement, setAnnouncement] = useState<Announcement>({
    id: 0,
    text: "",
  });

  const announce = useCallback((text: string) => {
    setAnnouncement((prev) => ({ id: prev.id + 1, text }));
  }, []);

  const handleNumberClick = useCallback(
    (value: number) => {
      if (round.display === "compute") {
        const correct = value === round.expectedDistance;
        announce(
          correct
            ? t("distance.answerCorrect")
            : t("distance.answerIncorrect", {
                answer: String(round.expectedDistance),
              })
        );
      }
      submitAnswer({ kind: "compute", value });
    },
    [submitAnswer, round, announce, t]
  );

  const handleCardClick = useCallback(
    (value: PlayingCard) => {
      if (round.display === "apply") {
        const correct =
          value.suit === round.answerCard.card.suit &&
          value.rank === round.answerCard.card.rank;
        announce(
          correct
            ? t("distance.answerCorrect")
            : t("distance.answerIncorrect", {
                answer: formatCardName(round.answerCard.card),
              })
        );
      }
      submitAnswer({ kind: "apply", value });
    },
    [submitAnswer, round, announce, t, formatCardName]
  );

  return (
    <>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement.text}
        {announcement.id % 2 === 1 ? "​" : ""}
      </span>
      <Grid.Col span={12}>
        <Space h="xl" />
        {timerSettings.enabled && (
          <TimerDisplay
            timeRemaining={timeRemaining}
            timerDuration={timerDuration}
          />
        )}
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
            items={numberItems(round.choices.data)}
            onItemClick={handleNumberClick}
          />
        ) : (
          <CardSpread
            canMove={false}
            hasCursor={true}
            items={cardItems(round.choices.data.map((c) => c.card))}
            onItemClick={handleCardClick}
          />
        )}
      </Grid.Col>
    </>
  );
};
