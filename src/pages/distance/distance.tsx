import { Grid, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "../../components/error-boundary";
import { buildBreadcrumbSchema, JsonLd } from "../../components/json-ld";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TrainingHeader } from "../../components/training-header";
import { MIN_DISTANCE_RANGE, ROUTES } from "../../constants";
import { useCardImagePreload } from "../../hooks/use-card-image-preload";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { useStackLimits } from "../../hooks/use-stack-limits";
import { DistanceActiveRound } from "./distance-active-round";
import { DistanceRangeTooSmallAlert } from "./distance-range-too-small-alert";
import { DistanceSettingsContent } from "./distance-settings-content";
import { useDistanceGame } from "./use-distance-game";
import { useDistanceSettings } from "./use-distance-settings";

const ACTIVE_MODE_KEYS = {
  compute: "distance.activeModeCompute",
  apply: "distance.activeModeApply",
  both: "distance.activeModeBoth",
} as const;

const breadcrumbSchema = buildBreadcrumbSchema("Distance", ROUTES.distance);

export const Distance = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("distance.pageTitle"),
    description: t("distance.pageDescription"),
  });
  useCardImagePreload();

  const { stackKey, stackOrder, stackName } = useRequiredStack();

  const {
    mode,
    convention,
    timerSettings,
    setTimerDuration,
    handleModeChange,
    handleConventionChange,
    handleTimerEnabledChange,
  } = useDistanceSettings();

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
    mode: "distance",
    stackKey,
    distanceMode: mode,
    distanceConvention: convention,
    autoStart: true,
    stackLimits: limits,
  });

  const rangeTooSmall = rangeSize < MIN_DISTANCE_RANGE;

  // Disable the timer when the range is too small to play. The page hides
  // the prompt UI in that branch, but the hook is still mounted (rules of
  // hooks); without this override the timer would tick on placeholder state
  // and accumulate phantom fails into the active session. Memoized so the
  // override branch doesn't allocate a fresh object every render — that
  // would thrash any effect in useGameTimer keyed on timerSettings identity.
  const effectiveTimerSettings = useMemo(
    () =>
      rangeTooSmall ? { ...timerSettings, enabled: false } : timerSettings,
    [rangeTooSmall, timerSettings]
  );

  // Safe to invoke unconditionally even when rangeTooSmall: the reducer's
  // generateNextDistanceRound short-circuits to a placeholder payload (see
  // buildRangeTooSmallPayload) when cycleSize < MIN_DISTANCE_RANGE, the
  // timer is force-disabled above, and the page hides the prompt UI.
  const {
    score,
    card,
    round,
    convention: roundConvention,
    timeRemaining,
    timerDuration,
    submitAnswer,
    revealAnswer,
  } = useDistanceGame(
    stackOrder,
    stackName,
    mode,
    convention,
    effectiveTimerSettings,
    limits,
    { onAnswer: handleAnswer }
  );

  const activeModeLabel = t(ACTIVE_MODE_KEYS[mode]);

  return (
    <ErrorBoundary>
      <div className="fullMantineContainerHeight">
        <JsonLd data={breadcrumbSchema} />
        <Grid
          gap={0}
          overflow="hidden"
          style={{ display: "grid", height: "100%" }}
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
                <DistanceSettingsContent
                  convention={convention}
                  mode={mode}
                  onConventionChange={handleConventionChange}
                  onDurationChange={setTimerDuration}
                  onModeChange={handleModeChange}
                  onTimerEnabledChange={handleTimerEnabledChange}
                  timerSettings={timerSettings}
                />
              }
              settingsTooltip={t("distance.settingsAriaLabel")}
              subtitle={activeModeLabel}
              title={t("distance.title")}
            />
            <Text c="dimmed" mb="xs" size="sm">
              {t("distance.pageDescription")}
            </Text>
            <span aria-hidden="true" className="sr-only">
              {t("distance.seoIntro")}
            </span>
          </Grid.Col>

          {rangeTooSmall ? (
            <DistanceRangeTooSmallAlert />
          ) : (
            <DistanceActiveRound
              card={card}
              round={round}
              roundConvention={roundConvention}
              submitAnswer={submitAnswer}
              timeRemaining={timeRemaining}
              timerDuration={timerDuration}
              timerSettings={timerSettings}
            />
          )}
        </Grid>
        {status.phase === "summary" && (
          <SessionSummaryModal
            onDismiss={dismissSummary}
            onNewSession={startNewSession}
            summary={status.summary}
          />
        )}
        {status.phase !== "summary" && !rangeTooSmall && (
          <RevealButton onReveal={revealAnswer} />
        )}
      </div>
    </ErrorBoundary>
  );
};
