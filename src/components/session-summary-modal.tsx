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
import type { SessionSummary } from "../types/session";
import { formatDuration, toAccuracyPercent } from "../utils/session";
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

  return (
    <Modal
      centered
      onClose={onDismiss}
      opened={true}
      title={<Title order={3}>Session Complete</Title>}
    >
      <Stack gap="md">
        <Text c="dimmed" fw={500} size="lg" ta="center">
          {encouragement}
        </Text>

        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <StatDisplay
            label="Questions"
            value={String(record.questionsCompleted)}
          />
          <StatDisplay label="Correct" value={String(record.successes)} />
          <StatDisplay label="Incorrect" value={String(record.fails)} />
          <StatDisplay label="Accuracy" value={`${accuracyPercent}%`} />
          <StatDisplay label="Best Streak" value={String(record.bestStreak)} />
          <StatDisplay
            label="Duration"
            value={formatDuration(record.durationSeconds)}
          />
        </SimpleGrid>

        {previousAverageAccuracy !== null && (
          <Group gap="xs" justify="center">
            <Text c="dimmed" size="sm">
              Previous avg:
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
          <Button onClick={onNewSession}>New Session</Button>
          <Button onClick={onDismiss} variant="subtle">
            Done
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
