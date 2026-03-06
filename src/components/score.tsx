import { Badge, Group } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { GameScore } from "../types/game";

export const Score = memo(function Score({ fails, successes }: GameScore) {
  const { t } = useTranslation();
  const total = successes + fails;

  return (
    <Group gap="xs">
      <Badge
        aria-label={t("score.correctAriaLabel", { count: successes })}
        bg="green.6"
        leftSection={<IconThumbUp aria-hidden={true} size={12} />}
        size="md"
      >
        {successes}
      </Badge>
      <Badge
        aria-label={t("score.incorrectAriaLabel", { count: fails })}
        bg="red.6"
        leftSection={<IconThumbDown aria-hidden={true} size={12} />}
        size="md"
      >
        {fails}
      </Badge>
      <span
        aria-live="polite"
        className="sr-only"
        data-testid="score-live-region"
      >
        {total === 1 || (total > 0 && total % 5 === 0)
          ? `${t("score.correctAriaLabel", { count: successes })}, ${t("score.incorrectAriaLabel", { count: fails })}`
          : ""}
      </span>
    </Group>
  );
});
