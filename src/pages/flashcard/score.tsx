import { Badge, Group } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { memo } from "react";

type ScoreData = {
  successes: number;
  fails: number;
};

export const Score = memo(function Score({
  fails = 0,
  successes = 0,
}: ScoreData) {
  return (
    <Group gap="xs">
      <Badge bg="green.6" leftSection={<IconThumbUp size={12} />} size="md">
        {successes}
      </Badge>
      <Badge bg="red.6" leftSection={<IconThumbDown size={12} />} size="md">
        {fails}
      </Badge>
    </Group>
  );
});
