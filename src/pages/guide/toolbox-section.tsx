import { Anchor, List, Space, Text } from "@mantine/core";
import { IconTools } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
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
      <List spacing="xs">
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.toolbox.lookupItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.toolbox.faroItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.toolbox.spellingItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.toolbox.sequencesItem"
          />
        </List.Item>
      </List>
      <Space h="sm" />
      <Anchor component={Link} to="/toolbox">
        {t("guide.toolbox.link")}
      </Anchor>
    </section>
  );
};
