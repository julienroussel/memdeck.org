import { Badge, Group } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { GameScore } from "../types/game";

export const Score = memo(function Score({ fails, successes }: GameScore) {
  const { t } = useTranslation();

  return (
    <Group gap="xs">
      <Badge
        aria-label={t("score.correctAriaLabel", { count: successes })}
        bg="green.6"
        leftSection={<IconThumbUp size={12} />}
        size="md"
      >
        {successes}
      </Badge>
      <Badge
        aria-label={t("score.incorrectAriaLabel", { count: fails })}
        bg="red.6"
        leftSection={<IconThumbDown size={12} />}
        size="md"
      >
        {fails}
      </Badge>
    </Group>
  );
});
