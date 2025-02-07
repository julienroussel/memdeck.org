import { Badge, Group } from '@mantine/core';
import { IconThumbDown, IconThumbUp } from '@tabler/icons-react';

export const Score = ({
  fails = 0,
  successes = 0,
}: {
  fails: number;
  successes: number;
}) => {
  return (
    <Group>
      <Badge leftSection={<IconThumbUp size={16} />} size="xl" bg="green.6">
        {successes}
      </Badge>
      <Badge leftSection={<IconThumbDown size={16} />} size="xl" bg="red.6">
        {fails}
      </Badge>
    </Group>
  );
};
