import {
  ActionIcon,
  Center,
  Grid,
  Group,
  Image,
  Space,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";
import { useMemo } from "react";
import { CardSpread } from "../../components/card-spread/card-spread";
import { NumberCard } from "../../components/number-card";
import { SessionBanner } from "../../components/session-banner";
import { SessionStartControls } from "../../components/session-start-controls";
import { SessionSummaryModal } from "../../components/session-summary-modal";
import { TimerDisplay } from "../../components/timer-display";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useSession } from "../../hooks/use-session";
import type { PlayingCard } from "../../types/playingcard";
import { cardItems, numberItems } from "../../types/typeguards";
import { FlashcardOptions } from "./flashcard-options";
import { Score } from "./score";
import { useFlashcardGame } from "./use-flashcard-game";

export const Flashcard = () => {
  useDocumentMeta({
    title: "Flashcard Training",
    description:
      "Practice your memorized deck with interactive flashcard drills. Train card-to-number, number-to-card, or both.",
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
  } = useFlashcardGame(stackOrder, stackName, { onAnswer: handleAnswer });
  const [options, { open, close }] = useDisclosure(false);

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
        gutter={0}
        overflow="hidden"
        style={{
          display: "grid",
          height: "100%",
        }}
      >
        <Grid.Col span={12}>
          <Group gap="xs" justify="space-between">
            <Title order={1}>Flashcard</Title>
            <Group gap="xs">
              <Score fails={score.fails} successes={score.successes} />
              <ActionIcon color="gray" onClick={open} variant="subtle">
                <IconSettings />
              </ActionIcon>
            </Group>
          </Group>
          {isStructuredSession && activeSession && (
            <SessionBanner onStop={stopSession} session={activeSession} />
          )}
          {!isStructuredSession && (
            <SessionStartControls onStart={startSession} />
          )}
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
            {shouldShowCard ? (
              <Image className="cardShadow" src={card.card.image} w="120px" />
            ) : (
              <NumberCard fontSize={60} number={card.index} width={120} />
            )}
          </Center>
          <Space h="xl" />
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }}>
          {shouldShowCard ? (
            <CardSpread
              canMove={false}
              hasCursor={true}
              items={numberChoices}
              onItemClick={(item: number) => submitAnswer(item)}
            />
          ) : (
            <CardSpread
              canMove={false}
              hasCursor={true}
              items={cardChoices}
              onItemClick={(item: PlayingCard) => submitAnswer(item)}
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
    </div>
  );
};
