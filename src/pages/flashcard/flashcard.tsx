import { Center, Grid, Image, Space } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { CSSProperties } from "react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { NumberCard } from "../../components/number-card";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
import { TrainingHeader } from "../../components/training-header";
import { CARD_HEIGHT, CARD_WIDTH } from "../../constants";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { analytics } from "../../services/analytics";
import type { PlayingCard } from "../../types/playingcard";
import { cardItems, numberItems } from "../../types/typeguards";
import { formatCardName } from "../../utils/card-formatting";
import { FlashcardOptions } from "./flashcard-options";
import { useFlashcardGame } from "./use-flashcard-game";

const CARD_VISIBLE_STYLE: CSSProperties = {
  visibility: "visible",
  position: "relative",
  top: 0,
  left: 0,
};

const CARD_HIDDEN_STYLE: CSSProperties = {
  visibility: "hidden",
  position: "absolute",
  top: 0,
  left: 0,
};

export const Flashcard = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("flashcard.pageTitle"),
    description: t("flashcard.pageDescription"),
  });
  const { stackKey, stackOrder, stackName } = useRequiredStack();
  const {
    status,
    startSession,
    handleAnswer,
    startNewSession,
    isStructuredSession,
    activeSession,
    stopSession,
    dismissSummary,
  } = useSession({ mode: "flashcard", stackKey, autoStart: true });

  const {
    score,
    card,
    choices,
    shouldShowCard,
    timeRemaining,
    timerEnabled,
    timerDuration,
    submitAnswer,
    revealAnswer,
  } = useFlashcardGame(stackOrder, stackName, { onAnswer: handleAnswer });
  const [options, { open, close }] = useDisclosure(false);

  const handleOpenSettings = useCallback(() => {
    analytics.trackFeatureUsed("Flashcard Settings");
    open();
  }, [open]);

  const handleRevealAnswer = useCallback(() => {
    analytics.trackFeatureUsed("Reveal Answer - Flashcard");
    revealAnswer();
  }, [revealAnswer]);

  const numberChoices = useMemo(
    () => numberItems(choices.map((c) => c.index)),
    [choices]
  );
  const cardChoices = useMemo(
    () => cardItems(choices.map((c) => c.card)),
    [choices]
  );

  const handleNumberChoice = useCallback(
    (item: number) => submitAnswer(item),
    [submitAnswer]
  );
  const handleCardChoice = useCallback(
    (item: PlayingCard) => submitAnswer(item),
    [submitAnswer]
  );
  return (
    <div className="fullMantineContainerHeight">
      <Grid
        gutter={0}
        overflow="hidden"
        style={{
          display: "grid",
          height: "100%",
        }}
      >
        <Grid.Col span={12}>
          <TrainingHeader
            activeSession={activeSession}
            isStructuredSession={isStructuredSession}
            onOpenSettings={handleOpenSettings}
            onStartSession={startSession}
            onStopSession={stopSession}
            score={score}
            settingsAriaLabel={t("flashcard.settingsAriaLabel")}
            title={t("flashcard.title")}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <Space h="xl" />
          {timerEnabled && (
            <TimerDisplay
              timeRemaining={timeRemaining}
              timerDuration={timerDuration}
            />
          )}
          <Center>
            <div
              style={{
                position: "relative",
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
              }}
            >
              <Image
                alt={formatCardName(card.card)}
                className="cardShadow"
                h={CARD_HEIGHT}
                src={card.card.image}
                style={shouldShowCard ? CARD_VISIBLE_STYLE : CARD_HIDDEN_STYLE}
                w={CARD_WIDTH}
              />
              <NumberCard
                fontSize={60}
                number={card.index}
                style={shouldShowCard ? CARD_HIDDEN_STYLE : CARD_VISIBLE_STYLE}
                width={CARD_WIDTH}
              />
            </div>
          </Center>
          <Space h="xl" />
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }}>
          {shouldShowCard ? (
            <CardSpread
              canMove={false}
              hasCursor={true}
              items={numberChoices}
              onItemClick={handleNumberChoice}
            />
          ) : (
            <CardSpread
              canMove={false}
              hasCursor={true}
              items={cardChoices}
              onItemClick={handleCardChoice}
            />
          )}
          <FlashcardOptions close={close} opened={options} />
        </Grid.Col>
      </Grid>
      {status.phase === "summary" && (
        <SessionSummaryModal
          onDismiss={dismissSummary}
          onNewSession={startNewSession}
          summary={status.summary}
        />
      )}
      {status.phase !== "summary" && (
        <RevealButton onReveal={handleRevealAnswer} />
      )}
    </div>
  );
};
