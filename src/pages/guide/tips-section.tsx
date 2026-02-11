import { List, Space } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { SectionHeading } from "./section-heading";

export const TipsSection = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        color="cyan"
        icon={<IconInfoCircle size={14} />}
        title={t("guide.tips.title")}
      />
      <Space h="sm" />
      <List spacing="xs">
        <List.Item>{t("guide.tips.dataLocal")}</List.Item>
        <List.Item>{t("guide.tips.darkMode")}</List.Item>
        <List.Item>{t("guide.tips.gearIcon")}</List.Item>
        <List.Item>{t("guide.tips.switchStacks")}</List.Item>
      </List>
    </section>
  );
};
