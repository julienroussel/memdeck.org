import { Badge, type MantineColor, ThemeIcon, Title } from "@mantine/core";
import type { ReactNode } from "react";

type SectionHeadingProps = {
  icon: ReactNode;
  color: MantineColor;
  title: string;
  badge?: {
    label: string;
    color?: string;
  };
};

export const SectionHeading = ({
  icon,
  color,
  title,
  badge,
}: SectionHeadingProps) => (
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
    {title}{" "}
    {badge && (
      <Badge color={badge.color} ml="xs" size="sm" variant="light">
        {badge.label}
      </Badge>
    )}
  </Title>
);
