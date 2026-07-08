import { Badge, Group } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { GameScore } from "../types/game";

export const Score = memo(({ fails, successes }: GameScore) => {
  const { t } = useTranslation();
  const total = successes + fails;

  return (
    <Group gap="xs">
      <Badge
        aria-label={t("score.correctAriaLabel", { count: successes })}
        bg="green.6"
        data-testid="score-success"
        leftSection={<IconThumbUp aria-hidden={true} size={12} />}
        size="md"
      >
        {successes}
      </Badge>
      <Badge
        aria-label={t("score.incorrectAriaLabel", { count: fails })}
        bg="red.6"
        data-testid="score-fail"
        leftSection={<IconThumbDown aria-hidden={true} size={12} />}
        size="md"
      >
        {fails}
      </Badge>
      {/*
        Aria-live announcement throttled to first answer + every 5th to avoid
        screen-reader overload during fast-paced training sessions. The visible
        badges still update every render; only the spoken announcement skips
        intermediate totals.
      */}
      <span
        aria-live="polite"
        className="sr-only"
        data-testid="score-live-region"
      >
        {total > 0 && (total === 1 || total % 5 === 0)
          ? `${t("score.correctAriaLabel", { count: successes })}, ${t("score.incorrectAriaLabel", { count: fails })}`
          : ""}
      </span>
    </Group>
  );
});

Score.displayName = "Score";
