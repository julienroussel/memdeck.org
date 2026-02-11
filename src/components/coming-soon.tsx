import { Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface ComingSoonProps {
  title: string;
}

export const ComingSoon = ({ title }: ComingSoonProps) => {
  const { t } = useTranslation();

  return (
    <>
      <Title order={1}>{title}</Title>
      <Text c="dimmed">{t("common.comingSoon")}</Text>
    </>
  );
};
