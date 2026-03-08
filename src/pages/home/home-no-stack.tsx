import {
  Card,
  Group,
  SimpleGrid,
  Space,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBook2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ShareNudge } from "../../components/share-nudge";
import { StackPicker } from "../../components/stack-picker";
import { FEATURE_CARDS } from "./feature-cards";
import { WhyNotAi } from "./why-not-ai";

export const HomeNoStack = () => {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t("home.welcome")}</Title>
        <Space h="xs" />
        <Text c="dimmed" size="sm">
          {t("home.whatIsMemdeck")}
        </Text>
        <Space h="sm" />
        <Text>{t("home.introNew")}</Text>
      </div>

      <div>
        <StackPicker />
        <Space h="xs" />
        <Text c="dimmed" size="sm">
          {t("home.stackPickerHint")}
        </Text>
      </div>

      <div>
        <Title order={3}>{t("home.featuresTitle")}</Title>
        <Space h="sm" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {FEATURE_CARDS.map((feature) => (
            <Card
              component={Link}
              key={feature.titleKey}
              padding="lg"
              radius="md"
              shadow="sm"
              td="none"
              to={feature.fallbackTo}
              withBorder
            >
              <Group>
                <ThemeIcon
                  aria-hidden="true"
                  color={feature.color}
                  radius="xl"
                  size="lg"
                  variant="light"
                >
                  <feature.icon size={20} stroke={1.5} />
                </ThemeIcon>
                <Stack gap={4}>
                  <Text fw={600}>{t(feature.titleKey)}</Text>
                  <Text c="dimmed" size="sm">
                    {t(feature.descKey)}
                  </Text>
                </Stack>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </div>

      <WhyNotAi />

      <Card
        component={Link}
        padding="lg"
        radius="md"
        shadow="sm"
        td="none"
        to="/guide"
        withBorder
      >
        <Group>
          <ThemeIcon
            aria-hidden="true"
            color="blue"
            radius="xl"
            size="lg"
            variant="light"
          >
            <IconBook2 size={20} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text fw={600}>{t("home.guideCardTitle")}</Text>
            <Text c="dimmed" size="sm">
              {t("home.guideCardDescription")}
            </Text>
          </Stack>
        </Group>
      </Card>

      <ShareNudge />
    </Stack>
  );
};
