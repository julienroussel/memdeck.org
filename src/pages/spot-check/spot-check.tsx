import { Space, Stack, Text } from "@mantine/core";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
import { TrainingHeader } from "../../components/training-header";
import { SPOT_CHECK_MODE_LSK } from "../../constants";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { useSpotCheckTimer } from "../../hooks/use-spot-check-timer";
import { analytics } from "../../services/analytics";
import { eventBus } from "../../services/event-bus";
import {
  isSpotCheckMode,
  type SpotCheckI18nKey,
  type SpotCheckMode,
} from "../../types/spot-check";
import { cardItems } from "../../types/typeguards";
import { useLocalDb } from "../../utils/localstorage";
import { SpotCheckSettingsContent } from "./spot-check-settings-content";
import { useSpotCheckGame } from "./use-spot-check-game";

const MODE_INSTRUCTION_LABELS = {
  missing: "spotCheck.identifyMissing",
  swapped: "spotCheck.identifySwapped",
  moved: "spotCheck.identifyMoved",
} as const satisfies Record<SpotCheckMode, SpotCheckI18nKey>;

const MODE_DISPLAY_LABELS = {
  missing: "spotCheck.modeMissing",
  swapped: "spotCheck.modeSwapped",
  moved: "spotCheck.modeMoved",
} as const satisfies Record<SpotCheckMode, SpotCheckI18nKey>;

export const SpotCheck = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("spotCheck.pageTitle"),
    description: t("spotCheck.pageDescription"),
  });
  const { stackKey, stackOrder, stackName } = useRequiredStack();

  const [mode, setMode] = useLocalDb<SpotCheckMode>(
    SPOT_CHECK_MODE_LSK,
    "missing",
    isSpotCheckMode
  );

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
    mode: "spotcheck",
    stackKey,
    spotCheckMode: mode,
    autoStart: true,
  });

  const handleModeChange = useCallback(
    (value: SpotCheckMode) => {
      setMode(value);
      eventBus.emit.SPOT_CHECK_MODE_CHANGED({ mode: value });
    },
    [setMode]
  );

  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useSpotCheckTimer();

  const {
    score,
    puzzleCards,
    timeRemaining,
    timerDuration,
    submitAnswer,
    revealAnswer,
  } = useSpotCheckGame(stackOrder, stackName, mode, timerSettings, {
    onAnswer: handleAnswer,
  });

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      analytics.trackEvent(
        "Settings",
        `Timer ${enabled ? "Enabled" : "Disabled"}`,
        "SpotCheck"
      );
      setTimerEnabled(enabled);
    },
    [setTimerEnabled]
  );

  const handleRevealAnswer = useCallback(() => {
    analytics.trackFeatureUsed("Reveal Answer - Spot Check");
    revealAnswer();
  }, [revealAnswer]);

  const puzzleCardItems = useMemo(() => cardItems(puzzleCards), [puzzleCards]);

  const modeLabel = t(MODE_DISPLAY_LABELS[mode]);

  return (
    <div className="fullMantineContainerHeight">
      <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
        <TrainingHeader
          activeSession={activeSession}
          isStructuredSession={isStructuredSession}
          onStartSession={startSession}
          onStopSession={stopSession}
          score={score}
          sessionTooltip={t("session.startSessionTooltip")}
          settingsContent={
            <SpotCheckSettingsContent
              mode={mode}
              onDurationChange={setTimerDuration}
              onModeChange={handleModeChange}
              onTimerEnabledChange={handleTimerEnabledChange}
              timerSettings={timerSettings}
            />
          }
          settingsTooltip={t("spotCheck.settingsAriaLabel")}
          title={
            <>
              {t("spotCheck.title")}
              <Text c="dimmed" fs="italic" size="xs">
                {modeLabel}
              </Text>
            </>
          }
        />
        <div>
          <Space h="md" />
          {timerSettings.enabled && (
            <TimerDisplay
              timeRemaining={timeRemaining}
              timerDuration={timerDuration}
            />
          )}
          <Text c="dimmed" fw={500} size="sm" ta="center">
            {t(MODE_INSTRUCTION_LABELS[mode])}
          </Text>
          <Space h="sm" />
        </div>
        <div style={{ flex: 1 }}>
          <CardSpread
            canMove
            degree={0.5}
            hasCursor={true}
            height="320px"
            items={puzzleCardItems}
            onItemClick={submitAnswer}
          />
        </div>
      </Stack>
      {status.phase === "summary" && (
        <SessionSummaryModal
          onDismiss={dismissSummary}
          onNewSession={startNewSession}
          summary={status.summary}
        />
      )}
      {status.phase === "active" && (
        <RevealButton onReveal={handleRevealAnswer} />
      )}
    </div>
  );
};
