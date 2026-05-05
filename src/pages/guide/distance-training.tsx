import { Anchor, List, Space, Text } from "@mantine/core";
import { IconArrowsLeftRight } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ROUTES } from "../../constants";
import { SectionHeading } from "./section-heading";

export const DistanceTraining = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        color="teal"
        icon={<IconArrowsLeftRight size={14} />}
        title={t("guide.distanceTraining.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.distanceTraining.intro")}</Text>
      <Space h="xs" />
      <List spacing="xs">
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.distanceTraining.computeItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.distanceTraining.applyItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.distanceTraining.bothItem"
          />
        </List.Item>
      </List>
      <Space h="sm" />
      <Text>
        <Trans
          components={{ bold: <Text fw={600} span /> }}
          i18nKey="guide.distanceTraining.convention"
        />
      </Text>
      <Space h="sm" />
      <Text>{t("guide.distanceTraining.settings")}</Text>
      <Space h="xs" />
      <Anchor component={Link} to={ROUTES.distance}>
        {t("guide.distanceTraining.link")}
      </Anchor>
    </section>
  );
};
