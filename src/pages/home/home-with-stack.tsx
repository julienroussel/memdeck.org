import { Button, SimpleGrid, Space, Stack, Text, Title } from "@mantine/core";
import {
  IconArrowsRightLeft,
  IconCards,
  IconChartBar,
  IconEyeSearch,
  IconTarget,
  IconTools,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";
import { NextChallengeCard } from "../../components/next-challenge-card";
import { ShareNudge } from "../../components/share-nudge";
import { StatDisplay } from "../../components/stat-display";
import { ROUTES } from "../../constants";
import { useAllTimeStats } from "../../hooks/use-all-time-stats";
import { useStackLimits } from "../../hooks/use-stack-limits";
import type { StackKey } from "../../types/stacks";
import {
  calculateAccuracy,
  toAccuracyPercent,
} from "../../utils/session-formatting";

type HomeWithStackProps = {
  stackKey: StackKey;
  stackName: string;
};

export const HomeWithStack = ({ stackKey, stackName }: HomeWithStackProps) => {
  const { t } = useTranslation();
  const { isFullDeck } = useStackLimits(stackKey);
  const { getGlobalStats } = useAllTimeStats();
  const globalStats = useMemo(() => getGlobalStats(), [getGlobalStats]);
  const hasStats = globalStats.totalSessions > 0;
  const accuracy = calculateAccuracy(
    globalStats.totalSuccesses,
    globalStats.totalFails
  );

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>{t("home.welcomeReturning")}</Title>
        <Space h="xs" />
        <Text c="dimmed">
          <Trans
            components={{ bold: <Text fw={700} span /> }}
            i18nKey="home.selectedStack"
            values={{ stackName }}
          />
          {" — "}
          <Text c="dimmed" size="sm" span>
            {t("home.switchStackHint")}
          </Text>
        </Text>
        {isFullDeck && (
          <Text c="dimmed" mt="xs" size="sm">
            {t("home.rangeHint")}
          </Text>
        )}
      </div>

      <div>
        <Title order={2}>{t("home.quickStart")}</Title>
        <Space h="sm" />
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }}>
          <Button
            component={Link}
            leftSection={<IconCards aria-hidden="true" size={18} />}
            to={ROUTES.flashcard}
            variant="light"
          >
            {t("home.featureFlashcardTitle")}
          </Button>
          <Button
            color="cyan"
            component={Link}
            leftSection={<IconEyeSearch aria-hidden="true" size={18} />}
            to={ROUTES.spotCheck}
            variant="light"
          >
            {t("home.featureSpotCheckTitle")}
          </Button>
          <Button
            color="orange"
            component={Link}
            leftSection={<IconTarget aria-hidden="true" size={18} />}
            to={ROUTES.acaan}
            variant="light"
          >
            {t("home.featureAcaanTitle")}
          </Button>
          <Button
            color="yellow"
            component={Link}
            leftSection={<IconArrowsRightLeft aria-hidden="true" size={18} />}
            to={ROUTES.distance}
            variant="light"
          >
            {t("home.featureDistanceTitle")}
          </Button>
          <Button
            color="green"
            component={Link}
            leftSection={<IconTools aria-hidden="true" size={18} />}
            to={ROUTES.toolbox}
            variant="light"
          >
            {t("home.featureToolboxTitle")}
          </Button>
          <Button
            color="violet"
            component={Link}
            leftSection={<IconChartBar aria-hidden="true" size={18} />}
            to={ROUTES.stats}
            variant="light"
          >
            {t("home.featureStatsTitle")}
          </Button>
        </SimpleGrid>
      </div>

      <div>
        <Title order={2}>{t("home.statsTitle")}</Title>
        <Space h="sm" />
        {hasStats ? (
          <SimpleGrid cols={{ base: 3, sm: 3 }}>
            <StatDisplay
              label={t("home.statSessions")}
              value={String(globalStats.totalSessions)}
              withBorder
            />
            <StatDisplay
              label={t("home.statAccuracy")}
              value={`${toAccuracyPercent(accuracy)}%`}
              withBorder
            />
            <StatDisplay
              label={t("home.statBestStreak")}
              value={String(globalStats.globalBestStreak)}
              withBorder
            />
          </SimpleGrid>
        ) : (
          <Text c="dimmed" size="sm">
            {t("home.noStatsYet")}
          </Text>
        )}
      </div>

      <ShareNudge />
      <NextChallengeCard surface="home" />
    </Stack>
  );
};
