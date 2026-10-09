import { ActionIcon, Group, Paper, Text } from "@mantine/core";
import { IconShare, IconX } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SHARE_NUDGE_DISMISSED_LSK } from "../constants";
import { useAllTimeStats } from "../hooks/use-all-time-stats";
import { analytics } from "../services/analytics";
import { useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";
import { notifyShareResult, shareMemDeck } from "../utils/share";
import { isShareNudgePending } from "../utils/share-nudge-eligibility";

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

export const ShareNudge = () => {
  const { t } = useTranslation();
  const { getGlobalStats } = useAllTimeStats();
  const [dismissed, setDismissed] = useLocalDb<boolean>(
    SHARE_NUDGE_DISMISSED_LSK,
    false,
    isBoolean,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  const globalStats = dismissed ? undefined : getGlobalStats();

  const handleDismiss = useCallback(() => {
    setDismissed(true, {
      onSuccess: () => {
        analytics.trackShareNudgeDismissed();
      },
    });
  }, [setDismissed]);

  const handleShare = useCallback(async () => {
    const result = await shareMemDeck(t("share.message"));
    analytics.trackShareClicked("nudge", result);
    notifyShareResult(result);
    // Stay visible on "failed" (so the user can retry) and on "cancelled"
    // (backing out of the sheet is not a choice to hide the nudge; the X is).
    if (result === "shared" || result === "copied") {
      handleDismiss();
    }
  }, [handleDismiss, t]);

  if (
    !(globalStats && isShareNudgePending(dismissed, globalStats.totalSessions))
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
