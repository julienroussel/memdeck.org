import { type MantineColor, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

type SectionHeadingProps = {
  icon: ReactNode;
  color: MantineColor;
  title: string;
};

export const SectionHeading = ({ icon, color, title }: SectionHeadingProps) => (
  <Title order={2}>
    <ThemeIcon
      aria-hidden="true"
      color={color}
      mr="xs"
      radius="xl"
      size="sm"
      variant="light"
    >
      {icon}
    </ThemeIcon>
    {title}
  </Title>
);
