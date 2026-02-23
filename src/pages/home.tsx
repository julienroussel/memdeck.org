import {
  Anchor,
  Card,
  Grid,
  Group,
  Space,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBook2 } from "@tabler/icons-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CardSpread } from "../components/card-spread/card-spread";
import { StackPicker } from "../components/stack-picker";
import { GITHUB_URL } from "../constants";
import { useDocumentMeta } from "../hooks/use-document-meta";
import { useSelectedStack } from "../hooks/use-selected-stack";
import { cardItems } from "../types/typeguards";

export const Home = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("home.pageTitle"),
    description: t("home.pageDescription"),
  });
  const { stackKey, stack, stackName } = useSelectedStack();

  const stackCards = useMemo(
    () => (stack ? cardItems([...stack.order]) : null),
    [stack]
  );

  const [showSpread, setShowSpread] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setShowSpread(true);
    });
  }, []);

  return (
    <div className="fullMantineContainerHeight">
      <Grid
        gutter={0}
        overflow="hidden"
        style={{
          display: "grid",
          height: "100%",
        }}
      >
        <Grid.Col span={12}>
          <Title order={2}>{t("home.welcome")}</Title>
          <Space h="lg" />
          <Text>
            <Trans
              components={{
                guideLink: <Anchor component={Link} to="/guide" />,
                githubLink: (
                  <Anchor
                    href={GITHUB_URL}
                    rel="noopener"
                    target="_blank"
                    underline="never"
                  />
                ),
              }}
              i18nKey="home.intro"
            />
          </Text>
          {stackKey === "" && (
            <>
              <Space h="lg" />
              <Text>{t("home.firstTimer")}</Text>
              <Space h="lg" />
              <StackPicker />
              <Space h="lg" />
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
            </>
          )}
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }}>
          {stackKey !== "" && stackCards && showSpread && (
            <>
              <Space h="lg" />
              <Text>
                <Trans
                  components={{
                    bold: <Text fw={700} span />,
                  }}
                  i18nKey="home.selectedStack"
                  values={{ stackName }}
                />
              </Text>
              <Space h="lg" />
              <CardSpread degree={0.5} items={stackCards} />
            </>
          )}
        </Grid.Col>
      </Grid>
    </div>
  );
};
