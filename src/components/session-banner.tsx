import { Badge, Button, Group, Paper } from "@mantine/core";
import { IconFlame, IconTargetArrow, IconTrophy } from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { ActiveSession } from "../types/session";
import {
  calculateAccuracy,
  toAccuracyPercent,
} from "../utils/session-formatting";
import { Score } from "./score";

type SessionBannerProps = {
  session: ActiveSession;
  onStop: () => void;
};

export const SessionBanner = memo(function SessionBanner({
  session,
  onStop,
}: SessionBannerProps) {
  const {
    config,
    questionsCompleted,
    successes,
    fails,
    currentStreak,
    bestStreak,
  } = session;
  const accuracy = calculateAccuracy(successes, fails);
  const accuracyPercent = toAccuracyPercent(accuracy);
  const { t } = useTranslation();

  const progressText =
    config.type === "structured"
      ? `${questionsCompleted}/${config.totalQuestions}`
      : `${questionsCompleted}`;

  return (
    <Paper mb="sm" p="xs" radius="sm" withBorder>
      <Group gap="md" justify="space-between">
        <Group gap="sm">
          <Badge
            aria-label={t("session.progressAriaLabel", {
              progress: progressText,
            })}
            size="lg"
            variant="filled"
          >
            {progressText}
          </Badge>
          <Score fails={fails} successes={successes} />
          <Badge
            aria-label={t("session.accuracyAriaLabel", {
              percent: accuracyPercent,
            })}
            leftSection={<IconTargetArrow size={12} />}
            size="md"
            variant="light"
          >
            {accuracyPercent}%
          </Badge>
          <Badge
            aria-label={t("session.currentStreakAriaLabel", {
              count: currentStreak,
            })}
            color="orange"
            leftSection={<IconFlame size={12} />}
            size="md"
            variant="light"
          >
            {currentStreak}
          </Badge>
          <Badge
            aria-label={t("session.bestStreakAriaLabel", {
              count: bestStreak,
            })}
            color="yellow"
            leftSection={<IconTrophy size={12} />}
            size="md"
            variant="light"
          >
            {bestStreak}
          </Badge>
        </Group>
        <Group gap="xs">
          <Button
            color="red"
            onClick={onStop}
            size="compact-xs"
            variant="subtle"
          >
            {t("common.stop")}
          </Button>
        </Group>
      </Group>
    </Paper>
  );
});
