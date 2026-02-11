import { Alert, List, Space, Text } from "@mantine/core";
import { IconInfoCircle, IconRocket } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { SectionHeading } from "./section-heading";

export const GettingStarted = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        color="green"
        icon={<IconRocket size={14} />}
        title={t("guide.gettingStarted.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.gettingStarted.intro")}</Text>
      <Space h="sm" />
      <Text>{t("guide.gettingStarted.selectStack")}</Text>
      <Space h="xs" />
      <List spacing="xs">
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.gettingStarted.stacks.tamariz"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.gettingStarted.stacks.aronson"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.gettingStarted.stacks.memorandum"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.gettingStarted.stacks.redford"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.gettingStarted.stacks.particle"
          />
        </List.Item>
      </List>
      <Space h="sm" />
      <Alert
        color="blue"
        icon={<IconInfoCircle size={16} />}
        title={t("guide.gettingStarted.alertTitle")}
      >
        {t("guide.gettingStarted.alertDescription")}
      </Alert>
    </section>
  );
};
