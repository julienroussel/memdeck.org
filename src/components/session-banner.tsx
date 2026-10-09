import { Badge, Button, Group, Paper, VisuallyHidden } from "@mantine/core";
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

export const SessionBanner = memo(({ session, onStop }: SessionBannerProps) => {
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

  // Mantine Badge renders a role-less element, where aria-label is not
  // allowed, so each badge carries its meaning as visually hidden text and
  // hides the bare visible value from assistive tech.
  return (
    <Paper mb="sm" p="xs" radius="sm" withBorder>
      <Group gap="md" justify="space-between">
        <Group gap="sm">
          <Badge size="lg" variant="filled">
            <VisuallyHidden>
              {t("session.progressAriaLabel", { progress: progressText })}
            </VisuallyHidden>
            <span aria-hidden="true">{progressText}</span>
          </Badge>
          <Score fails={fails} successes={successes} />
          <Badge
            leftSection={<IconTargetArrow size={12} />}
            size="md"
            variant="light"
          >
            <VisuallyHidden>
              {t("session.accuracyAriaLabel", { percent: accuracyPercent })}
            </VisuallyHidden>
            <span aria-hidden="true">
              {t("common.percent", { percent: accuracyPercent })}
            </span>
          </Badge>
          <Badge
            color="orange"
            leftSection={<IconFlame size={12} />}
            size="md"
            variant="light"
          >
            <VisuallyHidden>
              {t("session.currentStreakAriaLabel", { count: currentStreak })}
            </VisuallyHidden>
            <span aria-hidden="true">{currentStreak}</span>
          </Badge>
          <Badge
            color="yellow"
            leftSection={<IconTrophy size={12} />}
            size="md"
            variant="light"
          >
            <VisuallyHidden>
              {t("session.bestStreakAriaLabel", { count: bestStreak })}
            </VisuallyHidden>
            <span aria-hidden="true">{bestStreak}</span>
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

SessionBanner.displayName = "SessionBanner";
