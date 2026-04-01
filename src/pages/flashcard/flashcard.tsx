import { Grid, Space, Text } from "@mantine/core";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
import { TrainingHeader } from "../../components/training-header";
import { FLASHCARD_OPTION_LSK, NEIGHBOR_DIRECTION_LSK } from "../../constants";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useFlashcardTimer } from "../../hooks/use-flashcard-timer";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { useStackLimits } from "../../hooks/use-stack-limits";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import {
  type FlashcardMode,
  isFlashcardMode,
  isNeighborDirection,
  type NeighborDirection,
} from "../../types/flashcard";
import { cardItems, numberItems } from "../../types/typeguards";
import { useLocalDb } from "../../utils/localstorage";
import { FlashcardCardDisplay } from "./flashcard-card-display";
import { FlashcardSettingsContent } from "./flashcard-settings-content";
import { useFlashcardGame } from "./use-flashcard-game";

export const Flashcard = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("flashcard.pageTitle"),
    description: t("flashcard.pageDescription"),
  });
  const { stackKey, stackOrder, stackName } = useRequiredStack();

  const [mode, setMode] = useLocalDb<FlashcardMode>(
    FLASHCARD_OPTION_LSK,
    "bothmodes",
    isFlashcardMode
  );
  const [neighborDirection, setNeighborDirection] =
    useLocalDb<NeighborDirection>(
      NEIGHBOR_DIRECTION_LSK,
      "random",
      isNeighborDirection
    );

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

  const handleModeChange = useCallback(
    (value: FlashcardMode) => {
      if (!isFlashcardMode(value)) {
        return;
      }
      setMode(value);
      eventBus.emit.FLASHCARD_MODE_CHANGED({ mode: value });
    },
    [setMode]
  );

  const handleDirectionChange = useCallback(
    (value: NeighborDirection) => {
      if (!isNeighborDirection(value)) {
        return;
      }
      setNeighborDirection(value);
      eventBus.emit.NEIGHBOR_DIRECTION_CHANGED({ direction: value });
    },
    [setNeighborDirection]
  );

  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useFlashcardTimer();

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

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      analytics.trackEvent(
        "Settings",
        `Timer ${enabled ? "Enabled" : "Disabled"}`,
        "Flashcard"
      );
      setTimerEnabled(enabled);
    },
    [setTimerEnabled]
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
