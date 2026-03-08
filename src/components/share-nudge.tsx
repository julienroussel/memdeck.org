import { ActionIcon, Group, Paper, Text } from "@mantine/core";
import { IconShare, IconX } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SHARE_NUDGE_DISMISSED_LSK,
  SHARE_NUDGE_MIN_SESSIONS,
} from "../constants";
import { useAllTimeStats } from "../hooks/use-all-time-stats";
import { analytics } from "../services/analytics";
import { getStoredValue } from "../utils/localstorage";
import { shareMemDeck } from "../utils/share";

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

export const ShareNudge = () => {
  const { t } = useTranslation();
  const { getGlobalStats } = useAllTimeStats();
  const [dismissed, setDismissed] = useState(() =>
    getStoredValue(SHARE_NUDGE_DISMISSED_LSK, false, isBoolean)
  );

  const globalStats = dismissed ? undefined : getGlobalStats();

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(SHARE_NUDGE_DISMISSED_LSK, JSON.stringify(true));
    analytics.trackShareNudgeDismissed();
  }, []);

  const handleShare = useCallback(async () => {
    const result = await shareMemDeck(t("share.message"));
    analytics.trackShareClicked("nudge", result);
    handleDismiss();
  }, [handleDismiss, t]);

  if (
    dismissed ||
    !globalStats ||
    globalStats.totalSessions < SHARE_NUDGE_MIN_SESSIONS
  ) {
    return null;
  }

  return (
    <Paper p="sm" radius="md" shadow="xs" withBorder>
      <Group gap="sm" justify="space-between" wrap="nowrap">
        <Text c="dimmed" size="sm">
          {t("share.nudgeMessage")}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            aria-label={t("share.label")}
            color="blue"
            onClick={handleShare}
            size="sm"
            variant="light"
          >
            <IconShare aria-hidden="true" size={14} />
          </ActionIcon>
          <ActionIcon
            aria-label={t("share.nudgeDismiss")}
            c="dimmed"
            onClick={handleDismiss}
            size="sm"
            variant="subtle"
          >
            <IconX aria-hidden="true" size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
};
