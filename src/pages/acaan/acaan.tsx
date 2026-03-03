import {
  Button,
  Center,
  Grid,
  Group,
  Image,
  NumberInput,
  Space,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { NumberCard } from "../../components/number-card";
import { RevealButton } from "../../components/reveal-button";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import { TrainingHeader } from "../../components/training-header";
import { CARD_HEIGHT, CARD_WIDTH, DECK_SIZE } from "../../constants";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import { analytics } from "../../services/analytics";
import { formatCardName } from "../../utils/card-formatting";
import { useAcaanGame } from "./use-acaan-game";

/** Maximum valid cut depth (deck size - 1) */
const MAX_CUT_DEPTH = DECK_SIZE - 1;

/** Validates that cut depth is within valid range (0 to 51) */
const isValidCutDepth = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= MAX_CUT_DEPTH;

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

  const [cutDepth, setCutDepth] = useState<number | "">("");

  const handleCutDepthChange = useCallback((value: string | number) => {
    setCutDepth(value === "" ? "" : Number(value));
  }, []);

  const handleCheckAnswer = useCallback(() => {
    if (cutDepth === "") {
      return;
    }
    if (!isValidCutDepth(cutDepth)) {
      return;
    }
    submitAnswer(cutDepth);
    setCutDepth("");
  }, [cutDepth, submitAnswer]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && cutDepth !== "") {
        handleCheckAnswer();
      }
    },
    [cutDepth, handleCheckAnswer]
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
            <Group align="center" gap="xl">
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
          </Center>
          <Space h="xl" />
          <Center>
            <Group gap="md">
              <NumberInput
                allowDecimal={false}
                allowNegative={false}
                aria-label={t("acaan.cutDepthAriaLabel")}
                inputMode="numeric"
                max={MAX_CUT_DEPTH}
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
          </Center>
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
