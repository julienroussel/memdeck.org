import { Anchor, Space, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const ResourcesSection = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        color="orange"
        icon={<IconExternalLink size={14} />}
        title={t("guide.resources.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.resources.description")}</Text>
      <Space h="xs" />
      <Anchor component={Link} to="/resources">
        {t("guide.resources.link")}
      </Anchor>
    </section>
  );
};
