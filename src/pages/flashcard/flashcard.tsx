import { Grid, Space, Text } from "@mantine/core";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { JsonLd } from "../../components/json-ld";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
import { TrainingHeader } from "../../components/training-header";
import { SITE_URL } from "../../constants";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { useStackLimits } from "../../hooks/use-stack-limits";
import { analytics } from "../../services/analytics";
import { cardItems, numberItems } from "../../types/typeguards";
import { FlashcardCardDisplay } from "./flashcard-card-display";
import { FlashcardSettingsContent } from "./flashcard-settings-content";
import { useFlashcardGame } from "./use-flashcard-game";
import { useFlashcardSettings } from "./use-flashcard-settings";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Flashcard",
    },
  ],
};

export const Flashcard = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("flashcard.pageTitle"),
    description: t("flashcard.pageDescription"),
  });
  const { stackKey, stackOrder, stackName } = useRequiredStack();

  const {
    mode,
    neighborDirection,
    timerSettings,
    setTimerDuration,
    handleModeChange,
    handleDirectionChange,
    handleTimerEnabledChange,
  } = useFlashcardSettings();

  const { limits, rangeSize } = useStackLimits(stackKey);

  const {
    status,
    startSession,
    handleAnswer,
    startNewSession,
    isStructuredSession,
    activeSession,
    stopSession,
    dismissSummary,
  } = useSession({
    mode: "flashcard",
    stackKey,
    flashcardMode: mode,
    autoStart: true,
    stackLimits: limits,
  });

  const {
    score,
    card,
    choices,
    shouldShowCard,
    timeRemaining,
    timerDuration,
    isNeighborMode,
    resolvedDirection,
    submitAnswer,
    revealAnswer,
  } = useFlashcardGame(
    stackOrder,
    stackName,
    mode,
    neighborDirection,
    timerSettings,
    limits,
    { onAnswer: handleAnswer }
  );

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

  return (
    <div className="fullMantineContainerHeight">
      <JsonLd data={breadcrumbSchema} />
      <Grid
        gap={0}
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
            onStartSession={startSession}
            onStopSession={stopSession}
            rangeSize={rangeSize}
            score={score}
            sessionTooltip={t("session.startSessionTooltip")}
            settingsContent={
              <FlashcardSettingsContent
                mode={mode}
                neighborDirection={neighborDirection}
                onDirectionChange={handleDirectionChange}
                onDurationChange={setTimerDuration}
                onModeChange={handleModeChange}
                onTimerEnabledChange={handleTimerEnabledChange}
                timerSettings={timerSettings}
              />
            }
            settingsTooltip={t("flashcard.settingsAriaLabel")}
            title={
              <>
                {t("flashcard.title")}
                <Text c="dimmed" fs="italic" size="xs">
                  {mode === "neighbor"
                    ? t("flashcard.activeModeNeighbor")
                    : t("flashcard.activeModePosition")}
                </Text>
              </>
            }
          />
          <Text c="dimmed" mb="xs" size="sm">
            {t("flashcard.seoIntro")}
          </Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Space h="xl" />
          {timerSettings.enabled && (
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
          {!isNeighborMode && shouldShowCard ? (
            <CardSpread
              canMove={false}
              hasCursor={true}
              items={numberChoices}
              onItemClick={submitAnswer}
            />
          ) : (
            <CardSpread
              canMove={false}
              hasCursor={true}
              items={cardChoices}
              onItemClick={submitAnswer}
            />
          )}
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
