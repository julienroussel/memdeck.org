import { List, Space, Text } from "@mantine/core";
import { IconShieldCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { SectionHeading } from "./section-heading";

export const WhyDedicatedTool = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        color="green"
        icon={<IconShieldCheck aria-hidden="true" size={14} />}
        title={t("guide.whyDedicatedTool.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.whyDedicatedTool.intro")}</Text>
      <Space h="xs" />
      <List spacing="xs">
        <List.Item>{t("guide.whyDedicatedTool.speed")}</List.Item>
        <List.Item>{t("guide.whyDedicatedTool.offline")}</List.Item>
        <List.Item>{t("guide.whyDedicatedTool.visual")}</List.Item>
        <List.Item>{t("guide.whyDedicatedTool.progress")}</List.Item>
        <List.Item>{t("guide.whyDedicatedTool.free")}</List.Item>
      </List>
    </section>
  );
};
