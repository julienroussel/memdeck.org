import {
  Button,
  Grid,
  Group,
  Image,
  NumberInput,
  Space,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { JsonLd } from "../../components/json-ld";
import { NumberCard } from "../../components/number-card";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import { TrainingHeader } from "../../components/training-header";
import { CARD_HEIGHT, CARD_WIDTH, SITE_URL } from "../../constants";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { analytics } from "../../services/analytics";
import { formatCardName } from "../../utils/card-formatting";
import { useAcaanGame } from "./use-acaan-game";
import { useCutDepthInput } from "./use-cut-depth-input";

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
      name: "ACAAN",
    },
  ],
};

export const Acaan = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("acaan.pageTitle"),
    description: t("acaan.pageDescription"),
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
  } = useSession({ mode: "acaan", stackKey, autoStart: true });

  const {
    scenario,
    score,
    timeRemaining,
    timerEnabled,
    timerDuration,
    submitAnswer,
    revealAnswer,
  } = useAcaanGame(stackOrder, stackName, { onAnswer: handleAnswer });

  const { timerSettings, setTimerEnabled, setTimerDuration } = useAcaanTimer();

  const handleTimerEnabledChange = useCallback(
    (enabled: boolean) => {
      analytics.trackEvent(
        "Settings",
        `Timer ${enabled ? "Enabled" : "Disabled"}`,
        "ACAAN"
      );
      setTimerEnabled(enabled);
    },
    [setTimerEnabled]
  );

  const handleRevealAnswer = useCallback(() => {
    analytics.trackFeatureUsed("Reveal Answer - ACAAN");
    revealAnswer();
  }, [revealAnswer]);

  const {
    cutDepth,
    maxCutDepth,
    handleCutDepthChange,
    handleCheckAnswer,
    handleKeyDown,
  } = useCutDepthInput(submitAnswer);

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
            score={score}
            sessionTooltip={t("session.startSessionTooltip")}
            settingsContent={
              <Stack gap="md" p="xs">
                <TimerSettingsControl
                  onDurationChange={setTimerDuration}
                  onEnabledChange={handleTimerEnabledChange}
                  timerSettings={timerSettings}
                />
              </Stack>
            }
            settingsTooltip={t("acaan.settingsAriaLabel")}
            title={t("acaan.title")}
          />
          <Text c="dimmed" mb="xs" size="sm">
            {t("acaan.seoIntro")}
          </Text>
        </Grid.Col>
        <Grid.Col span={12}>
          <Space h="xl" />
          {timerEnabled && (
            <TimerDisplay
              timeRemaining={timeRemaining}
              timerDuration={timerDuration}
            />
          )}
          <Group align="center" gap="xl" justify="center">
            <Image
              alt={formatCardName(scenario.card)}
              className="cardShadow"
              h={CARD_HEIGHT}
              src={scenario.card.image}
              w={CARD_WIDTH}
            />
            <Text aria-hidden="true" fw={700} size="xl">
              →
            </Text>
            <NumberCard
              fontSize={60}
              number={scenario.targetPosition}
              width={CARD_WIDTH}
            />
          </Group>
          <Space h="xl" />
          <Group gap="md" justify="center">
            <NumberInput
              allowDecimal={false}
              allowNegative={false}
              aria-label={t("acaan.cutDepthAriaLabel")}
              inputMode="numeric"
              max={maxCutDepth}
              min={0}
              onChange={handleCutDepthChange}
              onKeyDown={handleKeyDown}
              placeholder={t("acaan.cutDepthPlaceholder")}
              size="md"
              value={cutDepth}
              w={140}
            />
            <Button
              disabled={cutDepth === ""}
              onClick={handleCheckAnswer}
              size="md"
            >
              {t("common.check")}
            </Button>
          </Group>
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }} />
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
