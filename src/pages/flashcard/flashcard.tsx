import { Grid, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildBreadcrumbSchema, JsonLd } from "../../components/json-ld";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TrainingHeader } from "../../components/training-header";
import { ROUTES } from "../../constants";
import { useCardImagePreload } from "../../hooks/use-card-image-preload";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { useStackLimits } from "../../hooks/use-stack-limits";
import {
  tryHandler,
  useSuggestionDeepLink,
} from "../../hooks/use-suggestion-deep-link";
import { isFlashcardMode } from "../../types/flashcard";
import { cardItems, numberItems } from "../../types/typeguards";
import { FlashcardActiveRound } from "./flashcard-active-round";
import { FlashcardSettingsContent } from "./flashcard-settings-content";
import { useFlashcardGame } from "./use-flashcard-game";
import { useFlashcardSettings } from "./use-flashcard-settings";

const breadcrumbSchema = buildBreadcrumbSchema("Flashcard", ROUTES.flashcard);

export const Flashcard = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    description: t("flashcard.pageDescription"),
    title: t("flashcard.pageTitle"),
  });
  useCardImagePreload();
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

  const deepLinkPending = useSuggestionDeepLink({
    onTimed: () => handleTimerEnabledChange(true),
    tryHandlers: [tryHandler(isFlashcardMode, handleModeChange)],
  });

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
    autoStart: !deepLinkPending,
    flashcardMode: mode,
    mode: "flashcard",
    stackKey,
    stackLimits: limits,
    timed: timerSettings.enabled,
  });

  const {
    score,
    card,
    answerCard,
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
            subtitle={
              mode === "neighbor"
                ? t("flashcard.activeModeNeighbor")
                : t("flashcard.activeModePosition")
            }
            title={t("flashcard.title")}
          />
          <Text c="dimmed" mb="xs" size="sm">
            {t("flashcard.pageDescription")}
          </Text>
          <span aria-hidden="true" className="sr-only">
            {t("flashcard.seoIntro")}
          </span>
        </Grid.Col>
        <FlashcardActiveRound
          answerCard={answerCard}
          card={card}
          cardChoices={cardChoices}
          isNeighborMode={isNeighborMode}
          numberChoices={numberChoices}
          onSubmitAnswer={submitAnswer}
          resolvedDirection={resolvedDirection}
          shouldShowCard={shouldShowCard}
          timeRemaining={timeRemaining}
          timerDuration={timerDuration}
          timerEnabled={timerSettings.enabled}
        />
      </Grid>
      {status.phase === "summary" && (
        <SessionSummaryModal
          onDismiss={dismissSummary}
          onNewSession={startNewSession}
          summary={status.summary}
        />
      )}
      {status.phase !== "summary" && <RevealButton onReveal={revealAnswer} />}
    </div>
  );
};
