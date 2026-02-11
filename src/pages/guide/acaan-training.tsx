import { Anchor, Space, Text } from "@mantine/core";
import { IconNumber } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const AcaanTraining = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        badge={{ label: t("guide.acaanTraining.requiresStack") }}
        color="violet"
        icon={<IconNumber size={14} />}
        title={t("guide.acaanTraining.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.acaanTraining.intro")}</Text>
      <Space h="sm" />
      <Text>{t("guide.acaanTraining.description")}</Text>
      <Space h="xs" />
      <Anchor component={Link} to="/acaan">
        {t("guide.acaanTraining.link")}
      </Anchor>
    </section>
  );
};
