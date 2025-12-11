import { Badge, Group } from "@mantine/core";
import { IconThumbDown, IconThumbUp } from "@tabler/icons-react";

export const Score = ({
  fails = 0,
  successes = 0,
}: {
  fails: number;
  successes: number;
}) => (
  <Group gap="xs">
    <Badge bg="green.6" leftSection={<IconThumbUp size={12} />} size="md">
      {successes}
    </Badge>
    <Badge bg="red.6" leftSection={<IconThumbDown size={12} />} size="md">
      {fails}
    </Badge>
  </Group>
);
