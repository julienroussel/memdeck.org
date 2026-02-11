import { Anchor, List, Space, Text } from "@mantine/core";
import { IconPlayCardStar } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const FlashcardTraining = () => {
  const { t } = useTranslation();

  return (
    <section>
      <SectionHeading
        badge={{ label: t("guide.flashcardTraining.requiresStack") }}
        color="blue"
        icon={<IconPlayCardStar size={14} />}
        title={t("guide.flashcardTraining.title")}
      />
      <Space h="sm" />
      <Text>{t("guide.flashcardTraining.intro")}</Text>
      <Space h="xs" />
      <List spacing="xs">
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.flashcardTraining.cardOnlyItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.flashcardTraining.numberOnlyItem"
          />
        </List.Item>
        <List.Item>
          <Trans
            components={{ bold: <Text fw={600} span /> }}
            i18nKey="guide.flashcardTraining.bothItem"
          />
        </List.Item>
      </List>
      <Space h="sm" />
      <Text>{t("guide.flashcardTraining.settings")}</Text>
      <Space h="xs" />
      <Anchor component={Link} to="/flashcard">
        {t("guide.flashcardTraining.link")}
      </Anchor>
    </section>
  );
};
