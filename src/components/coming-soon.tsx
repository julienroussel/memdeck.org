import { Text, Title } from "@mantine/core";

interface ComingSoonProps {
  title: string;
}

export const ComingSoon = ({ title }: ComingSoonProps) => (
  <>
    <Title order={1}>{title}</Title>
    <Text c="dimmed">Coming soon...</Text>
  </>
);
