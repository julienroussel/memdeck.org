import { Alert, Badge, List, Space, Text } from "@mantine/core";
import { IconInfoCircle, IconRocket } from "@tabler/icons-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { CardSpread } from "../../components/card-spread/card-spread";
import { useSelectedStack } from "../../hooks/use-selected-stack";
import { cardItems } from "../../types/typeguards";
import { SectionHeading } from "./section-heading";

const STACK_ITEMS = [
  { key: "mnemonica", i18nKey: "guide.gettingStarted.stacks.tamariz" },
  { key: "aronson", i18nKey: "guide.gettingStarted.stacks.aronson" },
  { key: "memorandum", i18nKey: "guide.gettingStarted.stacks.memorandum" },
  { key: "redford", i18nKey: "guide.gettingStarted.stacks.redford" },
  { key: "particle", i18nKey: "guide.gettingStarted.stacks.particle" },
  { key: "elephant", i18nKey: "guide.gettingStarted.stacks.elephant" },
  { key: "infinity", i18nKey: "guide.gettingStarted.stacks.infinity" },
] as const;

export const GettingStarted = () => {
  const { t } = useTranslation();
  const { stackKey, stack } = useSelectedStack();
  const stackCards = useMemo(
    () => (stack ? cardItems([...stack.order]) : null),
    [stack]
  );

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
        {STACK_ITEMS.map((item) => (
          <List.Item key={item.key}>
            <Trans
              components={{ bold: <Text fw={600} span /> }}
              i18nKey={item.i18nKey}
            />
            {stackKey === item.key && (
              <Badge ml="xs" size="sm" variant="light">
                {t("guide.gettingStarted.selected")}
              </Badge>
            )}
          </List.Item>
        ))}
      </List>
      {stackCards ? (
        <>
          <Space h="md" />
          <CardSpread degree={0.5} height="320px" items={stackCards} />
        </>
      ) : (
        <>
          <Space h="sm" />
          <Alert
            color="blue"
            icon={<IconInfoCircle size={16} />}
            title={t("guide.gettingStarted.alertTitle")}
          >
            {t("guide.gettingStarted.alertDescription")}
          </Alert>
        </>
      )}
    </section>
  );
};
