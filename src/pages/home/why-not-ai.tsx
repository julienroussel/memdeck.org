import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBolt,
  IconChartLine,
  IconCoin,
  IconEye,
  IconShieldCheck,
  IconWifi,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const REASONS = [
  {
    color: "green",
    descKey: "home.whyNotAiAccuracyDesc",
    icon: IconShieldCheck,
    titleKey: "home.whyNotAiAccuracy",
  },
  {
    color: "yellow",
    descKey: "home.whyNotAiSpeedDesc",
    icon: IconBolt,
    titleKey: "home.whyNotAiSpeed",
  },
  {
    color: "blue",
    descKey: "home.whyNotAiOfflineDesc",
    icon: IconWifi,
    titleKey: "home.whyNotAiOffline",
  },
  {
    color: "violet",
    descKey: "home.whyNotAiVisualDesc",
    icon: IconEye,
    titleKey: "home.whyNotAiVisual",
  },
  {
    color: "cyan",
    descKey: "home.whyNotAiProgressDesc",
    icon: IconChartLine,
    titleKey: "home.whyNotAiProgress",
  },
  {
    color: "orange",
    descKey: "home.whyNotAiFreeDesc",
    icon: IconCoin,
    titleKey: "home.whyNotAiFree",
  },
] as const;

export const WhyNotAi = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Title order={3}>{t("home.whyNotAiTitle")}</Title>
      <Text c="dimmed" mb="sm" mt="xs" size="sm">
        {t("home.whyNotAiIntro")}
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {REASONS.map((reason) => (
          <Card key={reason.titleKey} padding="md" radius="md" withBorder>
            <Group wrap="nowrap">
              <ThemeIcon
                aria-hidden="true"
                color={reason.color}
                radius="xl"
                size="lg"
                variant="light"
              >
                <reason.icon size={20} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={600} size="sm">
                  {t(reason.titleKey)}
                </Text>
                <Text c="dimmed" size="xs">
                  {t(reason.descKey)}
                </Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
};
