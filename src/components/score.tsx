import { Badge, Group } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { memo } from "react";
import type { GameScore } from "../types/game";

export const Score = memo(function Score({ fails, successes }: GameScore) {
  return (
    <Group gap="xs">
      <Badge
        aria-label={`Correct answers: ${successes}`}
        bg="green.6"
        leftSection={<IconThumbUp size={12} />}
        size="md"
      >
        {successes}
      </Badge>
      <Badge
        aria-label={`Incorrect answers: ${fails}`}
        bg="red.6"
        leftSection={<IconThumbDown size={12} />}
        size="md"
      >
        {fails}
      </Badge>
    </Group>
  );
});
