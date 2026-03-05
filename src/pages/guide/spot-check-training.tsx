import { Anchor, List, Space, Text } from "@mantine/core";
import { IconEyeSearch } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const SpotCheckTraining = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        color="cyan"
        icon={<IconEyeSearch size={14} />}
        title={t("guide.spotCheckTraining.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.spotCheckTraining.intro")}</Text>
      <Space h="xs" />
      <List spacing="xs">
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.spotCheckTraining.missingItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.spotCheckTraining.swappedItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.spotCheckTraining.movedItem"
          />
        </List.Item>
      </List>
      <Space h="sm" />
      <Text>{t("guide.spotCheckTraining.settings")}</Text>
      <Space h="xs" />
      <Anchor component={Link} to="/spot-check">
        {t("guide.spotCheckTraining.link")}
      </Anchor>
    </section>
  );
};
