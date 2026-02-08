import { Paper, Stack, Text } from "@mantine/core";

type StatDisplayProps = {
  label: string;
  value: string;
  withBorder?: boolean;
};

export const StatDisplay = ({
  label,
  value,
  withBorder = false,
}: StatDisplayProps) => {
  const labelSize = withBorder ? "sm" : "xs";
  const valueSize = withBorder ? "xl" : "lg";

  const content = (
    <Stack align="center" gap={withBorder ? 4 : 2}>
      <Text c="dimmed" size={labelSize}>
        {label}
      </Text>
      <Text fw={700} size={valueSize}>
        {value}
      </Text>
    </Stack>
  );

  if (withBorder) {
    return (
      <Paper p="md" radius="sm" withBorder>
        {content}
      </Paper>
    );
  }

  return content;
};
