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
    titleKey: "home.whyNotAiAccuracy",
    descKey: "home.whyNotAiAccuracyDesc",
    icon: IconShieldCheck,
    color: "green",
  },
  {
    titleKey: "home.whyNotAiSpeed",
    descKey: "home.whyNotAiSpeedDesc",
    icon: IconBolt,
    color: "yellow",
  },
  {
    titleKey: "home.whyNotAiOffline",
    descKey: "home.whyNotAiOfflineDesc",
    icon: IconWifi,
    color: "blue",
  },
  {
    titleKey: "home.whyNotAiVisual",
    descKey: "home.whyNotAiVisualDesc",
    icon: IconEye,
    color: "violet",
  },
  {
    titleKey: "home.whyNotAiProgress",
    descKey: "home.whyNotAiProgressDesc",
    icon: IconChartLine,
    color: "cyan",
  },
  {
    titleKey: "home.whyNotAiFree",
    descKey: "home.whyNotAiFreeDesc",
    icon: IconCoin,
    color: "orange",
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
