import { Grid, Space } from "@mantine/core";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { TimerDisplay } from "../../components/timer-display";
import type { PlayingCard } from "../../types/playingcard";
import type { PlayingCardPosition } from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";
import type { ResolvedDirection } from "../../utils/neighbor";
import { FlashcardCardDisplay } from "./flashcard-card-display";

type FlashcardActiveRoundProps = {
  card: PlayingCardPosition;
  answerCard: PlayingCardPosition;
  isNeighborMode: boolean;
  resolvedDirection: ResolvedDirection | null;
  shouldShowCard: boolean;
  timerEnabled: boolean;
  timeRemaining: number;
  timerDuration: number;
  numberChoices: { type: "numbers"; data: number[] };
  cardChoices: { type: "cards"; data: PlayingCard[] };
  onSubmitAnswer: (item: PlayingCard | number, index: number) => void;
};

type Announcement = { id: number; text: string };

/**
 * Renders the in-round contents of the Flashcard page: optional countdown,
 * the prompt card display, and the choice spread (cards or numbers depending
 * on mode). Extracted from `Flashcard` so the page component stays under the
 * 150-line guideline and so this round-display logic mirrors the
 * `DistanceActiveRound` split used by the Distance page.
 */
export const FlashcardActiveRound = ({
  card,
  answerCard,
  isNeighborMode,
  resolvedDirection,
  shouldShowCard,
  timerEnabled,
  timeRemaining,
  timerDuration,
  numberChoices,
  cardChoices,
  onSubmitAnswer,
}: FlashcardActiveRoundProps) => {
  const { t } = useTranslation();
  const [announcement, setAnnouncement] = useState<Announcement>({
    id: 0,
    text: "",
  });

  const announce = useCallback((text: string) => {
    setAnnouncement((prev) => ({ id: prev.id + 1, text }));
  }, []);

  const showNumberChoices = !isNeighborMode && shouldShowCard;

  const handleNumberClick = useCallback(
    (value: number, index: number) => {
      const correct = value === answerCard.index;
      announce(
        correct
          ? t("flashcard.answerCorrect")
          : t("flashcard.answerIncorrect", {
              answer: String(answerCard.index),
            })
      );
      onSubmitAnswer(value, index);
    },
    [answerCard, announce, onSubmitAnswer, t]
  );

  const handleCardClick = useCallback(
    (value: PlayingCard, index: number) => {
      const correct =
        value.suit === answerCard.card.suit &&
        value.rank === answerCard.card.rank;
      announce(
        correct
          ? t("flashcard.answerCorrect")
          : t("flashcard.answerIncorrect", {
              answer: formatCardName(answerCard.card),
            })
      );
      onSubmitAnswer(value, index);
    },
    [answerCard, announce, onSubmitAnswer, t]
  );

  return (
    <>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {announcement.text}
        {announcement.id % 2 === 1 ? "​" : ""}
      </span>
      <Grid.Col span={12}>
        <Space h="xl" />
        {timerEnabled && (
          <TimerDisplay
            timeRemaining={timeRemaining}
            timerDuration={timerDuration}
          />
        )}
        <FlashcardCardDisplay
          card={card}
          isNeighborMode={isNeighborMode}
          resolvedDirection={resolvedDirection}
          shouldShowCard={shouldShowCard}
        />
        <Space h="xl" />
      </Grid.Col>
      <Grid.Col span={12} style={{ height: "100%" }}>
        {showNumberChoices ? (
          <CardSpread
            canMove={false}
            hasCursor={true}
            items={numberChoices}
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
