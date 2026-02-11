import { Anchor, Space, Text } from "@mantine/core";
import { IconTools } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const ToolboxSection = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        badge={{ label: t("guide.toolbox.requiresStack") }}
        color="yellow"
        icon={<IconTools size={14} />}
        title={t("guide.toolbox.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.toolbox.description")}</Text>
      <Space h="xs" />
      <Anchor component={Link} to="/toolbox">
        {t("guide.toolbox.link")}
      </Anchor>
    </section>
  );
};
