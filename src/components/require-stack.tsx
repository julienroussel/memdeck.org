import { Center, Stack, Text } from "@mantine/core";
import type { ParseKeys } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSelectedStack } from "../hooks/use-selected-stack";

export const RequireStack = ({
  children,
  descriptionKey,
}: {
  children: ReactNode;
  descriptionKey: ParseKeys;
}) => {
  const { stackKey } = useSelectedStack();
  const { t } = useTranslation();

  if (stackKey === "") {
    return (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <Text c="dimmed" size="lg" ta="center">
            {t("common.noStackSelected")}
          </Text>
          <Text c="dimmed" maw={400} size="sm" ta="center">
            {t(descriptionKey)}
          </Text>
        </Stack>
      </Center>
    );
  }

  return children;
};
