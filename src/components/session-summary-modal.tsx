import {
  Badge,
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { SessionSummary } from "../types/session";
import { formatDuration, toAccuracyPercent } from "../utils/session-formatting";
import { StatDisplay } from "./stat-display";

type SessionSummaryModalProps = {
  summary: SessionSummary;
  onNewSession: () => void;
  onDismiss: () => void;
};

export const SessionSummaryModal = ({
  summary,
  onNewSession,
  onDismiss,
}: SessionSummaryModalProps) => {
  const {
    record,
    encouragement,
    isAccuracyImprovement,
    previousAverageAccuracy,
  } = summary;
  const accuracyPercent = toAccuracyPercent(record.accuracy);
  const { t } = useTranslation();

  const encouragementText = t(encouragement.key, encouragement.params);

  return (
    <Modal
      centered
      onClose={onDismiss}
      opened={true}
      title={<Title order={3}>{t("session.complete")}</Title>}
    >
      <Stack gap="md">
        <Text c="dimmed" fw={500} size="lg" ta="center">
          {encouragementText}
        </Text>

        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <StatDisplay
            label={t("common.questions")}
            value={String(record.questionsCompleted)}
          />
          <StatDisplay
            label={t("session.correct")}
            value={String(record.successes)}
          />
          <StatDisplay
            label={t("session.incorrect")}
            value={String(record.fails)}
          />
          <StatDisplay
            label={t("common.accuracy")}
            value={`${accuracyPercent}%`}
          />
          <StatDisplay
            label={t("common.bestStreak")}
            value={String(record.bestStreak)}
          />
          <StatDisplay
            label={t("common.duration")}
            value={formatDuration(record.durationSeconds)}
          />
        </SimpleGrid>

        {previousAverageAccuracy !== null && (
          <Group gap="xs" justify="center">
            <Text c="dimmed" size="sm">
              {t("session.previousAvg")}
            </Text>
            <Badge
              color={isAccuracyImprovement ? "green" : "gray"}
              size="sm"
              variant="light"
            >
              {toAccuracyPercent(previousAverageAccuracy)}%
            </Badge>
          </Group>
        )}

        <Group justify="center" mt="md">
          <Button onClick={onNewSession}>{t("common.newSession")}</Button>
          <Button onClick={onDismiss} variant="subtle">
            {t("common.done")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
