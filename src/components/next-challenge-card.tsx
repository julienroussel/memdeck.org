import { ActionIcon, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useFeatureDiscovery } from "../hooks/use-feature-discovery";
import { analytics } from "../services/analytics";
import type { DiscoverySurface } from "../types/discovery";

type NextChallengeCardProps = {
  surface: DiscoverySurface;
};

export const NextChallengeCard = ({ surface }: NextChallengeCardProps) => {
  const { t } = useTranslation();
  const { nextSuggestion, accept, dismiss, exploredCount, totalCount } =
    useFeatureDiscovery();
  // `eyebrowId` names the region landmark ("New challenge"); `titleId`
  // associates the generic "Try it" CTA with the suggestion title so the
  // link's purpose is unambiguous out of context (WCAG 2.4.4). `useId` keeps
  // both unique even if two cards mount (e.g. different `surface`s).
  const eyebrowId = useId();
  const titleId = useId();
  const suggestionId = nextSuggestion?.id;

  useEffect(() => {
    if (suggestionId) {
      analytics.trackFeatureSuggestionShown(suggestionId, surface);
    }
  }, [suggestionId, surface]);

  if (!nextSuggestion) {
    return null;
  }

  const { deepLink } = nextSuggestion;
  const to = `${nextSuggestion.route}${
    deepLink ? `?${deepLink.param}=${deepLink.value}` : ""
  }`;
  const Icon = nextSuggestion.icon;
  const handleAccept = () => accept(nextSuggestion.id, surface);
  const handleDismiss = () => dismiss(nextSuggestion.id, surface);

  return (
    <Paper
      aria-labelledby={eyebrowId}
      component="section"
      p="sm"
      radius="md"
      shadow="xs"
      withBorder
    >
      <Group align="flex-start" gap="sm" justify="space-between" wrap="nowrap">
        <Stack gap={4}>
          <Text c="dimmed" fw={700} id={eyebrowId} size="xs" tt="uppercase">
            {t("discovery.eyebrow")}
          </Text>
          <Text id={titleId} size="sm">
            {t(nextSuggestion.i18n.titleKey)}
          </Text>
          <Text c="dimmed" size="xs">
            {t("discovery.progress", {
              explored: exploredCount,
              total: totalCount,
            })}
          </Text>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <Button
            aria-describedby={titleId}
            component={Link}
            leftSection={<Icon aria-hidden="true" size={14} />}
            onClick={handleAccept}
            size="xs"
            to={to}
            variant="light"
          >
            {t(nextSuggestion.i18n.ctaKey ?? "discovery.cta")}
          </Button>
          <ActionIcon
            aria-label={t("discovery.dismiss")}
            c="dimmed"
            onClick={handleDismiss}
            size="sm"
            variant="subtle"
          >
            <IconX aria-hidden="true" size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
};
