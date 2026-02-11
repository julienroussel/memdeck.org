import { Anchor, Space, Text } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const StatsSection = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        badge={{ label: t("guide.stats.noStackRequired"), color: "green" }}
        color="teal"
        icon={<IconChartBar size={14} />}
        title={t("guide.stats.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.stats.description")}</Text>
      <Space h="xs" />
      <Anchor component={Link} to="/stats">
        {t("guide.stats.link")}
      </Anchor>
    </section>
  );
};
