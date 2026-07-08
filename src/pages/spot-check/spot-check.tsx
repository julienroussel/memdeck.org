import { Space, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { buildBreadcrumbSchema, JsonLd } from "../../components/json-ld";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
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
import {
  isSpotCheckMode,
  type SpotCheckI18nKey,
  type SpotCheckMode,
} from "../../types/spot-check";
import { cardItems } from "../../types/typeguards";
import { SpotCheckSettingsContent } from "./spot-check-settings-content";
import { useSpotCheckGame } from "./use-spot-check-game";
import { useSpotCheckSettings } from "./use-spot-check-settings";

const breadcrumbSchema = buildBreadcrumbSchema("Spot Check", ROUTES.spotCheck);

const MODE_INSTRUCTION_LABELS = {
  missing: "spotCheck.identifyMissing",
  moved: "spotCheck.identifyMoved",
  swapped: "spotCheck.identifySwapped",
} as const satisfies Record<SpotCheckMode, SpotCheckI18nKey>;

const MODE_DISPLAY_LABELS = {
  missing: "spotCheck.modeMissing",
  moved: "spotCheck.modeMoved",
  swapped: "spotCheck.modeSwapped",
} as const satisfies Record<SpotCheckMode, SpotCheckI18nKey>;

export const SpotCheck = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    description: t("spotCheck.pageDescription"),
    title: t("spotCheck.pageTitle"),
  });
  useCardImagePreload();
  const { stackKey, stackOrder, stackName } = useRequiredStack();

  const {
    mode,
    timerSettings,
    setTimerDuration,
    handleModeChange,
    handleTimerEnabledChange,
  } = useSpotCheckSettings();

  const deepLinkPending = useSuggestionDeepLink({
    onTimed: () => handleTimerEnabledChange(true),
    tryHandlers: [tryHandler(isSpotCheckMode, handleModeChange)],
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
    mode: "spotcheck",
    spotCheckMode: mode,
    stackKey,
    stackLimits: limits,
    timed: timerSettings.enabled,
  });

  const {
    score,
    puzzleCards,
    timeRemaining,
    timerDuration,
    submitAnswer,
    revealAnswer,
  } = useSpotCheckGame(stackOrder, stackName, mode, timerSettings, limits, {
    onAnswer: handleAnswer,
  });

  const puzzleCardItems = useMemo(() => cardItems(puzzleCards), [puzzleCards]);

  const modeLabel = t(MODE_DISPLAY_LABELS[mode]);

  return (
    <div className="fullMantineContainerHeight">
      <JsonLd data={breadcrumbSchema} />
      <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
        <TrainingHeader
          activeSession={activeSession}
          isStructuredSession={isStructuredSession}
          onStartSession={startSession}
          onStopSession={stopSession}
          rangeSize={rangeSize}
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
          subtitle={modeLabel}
          title={t("spotCheck.title")}
        />
        <Text c="dimmed" mb="xs" size="sm">
          {t("spotCheck.pageDescription")}
        </Text>
        <span aria-hidden="true" className="sr-only">
          {t("spotCheck.seoIntro")}
        </span>
        <div>
          <Space h="md" />
          {timerSettings.enabled ? (
            <TimerDisplay
              timeRemaining={timeRemaining}
              timerDuration={timerDuration}
            />
          ) : null}
          <Text c="dimmed" fw={500} size="sm" ta="center">
            {t(MODE_INSTRUCTION_LABELS[mode])}
          </Text>
          <Space h="sm" />
        </div>
        <div className="spotCheckSpread" style={{ flex: 1 }}>
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
      {status.phase === "active" && <RevealButton onReveal={revealAnswer} />}
    </div>
  );
};
