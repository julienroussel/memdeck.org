import { Badge, Group } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";
import { memo } from "react";

export const Score = memo(function Score({
  fails = 0,
  successes = 0,
}: {
  fails: number;
  successes: number;
}) {
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
