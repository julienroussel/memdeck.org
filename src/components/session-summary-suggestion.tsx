import { ActionIcon, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useFeatureDiscovery } from "../hooks/use-feature-discovery";
import { analytics } from "../services/analytics";
import type { SessionRecord } from "../types/session";

type SessionSummarySuggestionProps = {
  /** The just-finished session — keeps the prompt same-mode and fresh. */
  record: SessionRecord;
  /** Closes the host modal (the page's `dismissSummary`). */
  onClose: () => void;
};

/**
 * The post-session "ready for X?" nudge (#698). Shows one same-mode suggestion
 * inside the session-summary modal — the most timely moment to surface the next
 * variant of the mode just played. Shares the discovery state with the home card
 * (`accept` retires the suggestion everywhere, `dismiss` snoozes the surface),
 * and reuses the deep-link param so "Try it" lands the user in the variant via
 * the page's own `useSuggestionDeepLink` consumer. Renders nothing when no
 * eligible same-mode suggestion exists.
 */
export const SessionSummarySuggestion = ({
  record,
  onClose,
}: SessionSummarySuggestionProps) => {
  const { t } = useTranslation();
  const { nextSuggestion, accept, dismiss } = useFeatureDiscovery({
    completedRecord: record,
  });
  // `eyebrowId` labels the region; `titleId` ties the generic "Try it" CTA to
  // the suggestion pitch so the link's purpose is clear out of context
  // (WCAG 2.4.4). Mirrors next-challenge-card.tsx.
  const eyebrowId = useId();
  const titleId = useId();
  const suggestionId = nextSuggestion?.id;

  useEffect(() => {
    if (suggestionId) {
      analytics.trackFeatureSuggestionShown(suggestionId, "summary");
    }
  }, [suggestionId]);

  if (!nextSuggestion) {
    return null;
  }

  const { deepLink } = nextSuggestion;
  const to = `${nextSuggestion.route}${
    deepLink ? `?${deepLink.param}=${deepLink.value}` : ""
  }`;
  const Icon = nextSuggestion.icon;
  // Retire-on-accept (shared with the home card, so no double-suggesting), then
  // close the modal. The Link navigates to the same-mode deep link, which the
  // page's useSuggestionDeepLink consumer applies on the resulting param change.
  const handleTryIt = () => {
    accept(nextSuggestion.id, "summary");
    onClose();
  };
  // Snooze the whole surface (shared with the home card) without closing the
  // modal — the user keeps reading their stats, just without this nudge. Without
  // this affordance the same same-mode suggestion would reappear after every
  // completed session until accepted.
  const handleDismiss = () => {
    dismiss(nextSuggestion.id, "summary");
  };

  return (
    <Paper
      aria-labelledby={eyebrowId}
      component="section"
      p="sm"
      radius="md"
      shadow="xs"
      withBorder
    >
      <Stack gap="xs">
        <Text c="dimmed" fw={700} id={eyebrowId} size="xs" tt="uppercase">
          {t("discovery.summaryEyebrow")}
        </Text>
        <Group align="center" gap="sm" justify="space-between" wrap="nowrap">
          <Text id={titleId} size="sm">
            {t(nextSuggestion.i18n.titleKey)}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Button
              aria-describedby={titleId}
              component={Link}
              leftSection={<Icon aria-hidden="true" size={14} />}
              onClick={handleTryIt}
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
      </Stack>
    </Paper>
  );
};
