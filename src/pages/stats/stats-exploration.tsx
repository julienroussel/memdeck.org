import {
  Anchor,
  Box,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { IconCircle, IconCircleCheck } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useFeatureDiscovery } from "../../hooks/use-feature-discovery";
import type { FeatureSuggestion } from "../../types/discovery";
import { type SessionRecord, TRAINING_MODES } from "../../types/session";
import { deriveFeatureUsage } from "../../utils/feature-usage";
import {
  SUGGESTION_CATALOG,
  TOTAL_SUGGESTIONS,
} from "../../utils/suggestion-catalog";
import { MODE_LABELS } from "./stats-i18n";

// The catalog is a module constant, so group it by mode once at import rather
// than on every render. Each item's `mode` is a TrainingMode, so every item
// lands in exactly one group and the four groups cover all TOTAL_SUGGESTIONS.
const ITEMS_BY_MODE = TRAINING_MODES.map((mode) => ({
  mode,
  items: SUGGESTION_CATALOG.filter((item) => item.mode === mode),
}));

const ICON_SIZE = 18;

// Reset the browser's default list chrome — the rows carry their own spacing
// (the wrapping Stack's gap) and status markers (the ✓/○ icons).
const LIST_RESET = {
  listStyleType: "none",
  margin: 0,
  paddingInlineStart: 0,
} as const;

type ExplorationRowProps = {
  item: FeatureSuggestion;
  used: boolean;
  onTry: (id: string) => void;
};

const ExplorationRow = ({ item, used, onTry }: ExplorationRowProps) => {
  const { t } = useTranslation();
  const pitch = t(item.i18n.titleKey);

  // ✓/○ is driven by `used` (actual completion), never dismissed-state — tried
  // rows are static, untried rows are tappable. Both icons are decorative; the
  // VisuallyHidden status word carries the state for screen readers, so it isn't
  // conveyed by colour/shape alone (WCAG 1.4.1). Each row is a list item so the
  // group reads as an enumerable list to assistive tech (WCAG 1.3.1).
  if (used) {
    return (
      <Box component="li" role="listitem">
        <Group align="flex-start" gap="xs" wrap="nowrap">
          <IconCircleCheck
            aria-hidden="true"
            color="var(--mantine-color-green-6)"
            size={ICON_SIZE}
            style={{ flexShrink: 0 }}
          />
          <Text c="dimmed" flex={1} miw={0} size="sm">
            <VisuallyHidden>{t("discovery.explored")}: </VisuallyHidden>
            {pitch}
          </Text>
        </Group>
      </Box>
    );
  }

  // Deep-link URL — same shape as next-challenge-card.tsx:37-39 (inlined, not
  // shared: it's a one-liner, and extracting it would touch two shipped
  // consumers for no behavioural gain). Whole-mode items have no deepLink, so
  // `to` is just the (trailing-slashed) route.
  const to = `${item.route}${
    item.deepLink ? `?${item.deepLink.param}=${item.deepLink.value}` : ""
  }`;
  const handleClick = () => onTry(item.id);

  // The whole row is one Link (big tap target, no nested controls). Its
  // accessible name is "Not explored: {pitch}" — a descriptive link purpose
  // (WCAG 2.4.4), so no separate aria-label is needed. The Link lives inside the
  // <li> rather than being the <li> itself, so the link role is preserved.
  return (
    <Box component="li" role="listitem">
      <Anchor
        component={Link}
        display="block"
        onClick={handleClick}
        to={to}
        underline="hover"
      >
        <Group align="flex-start" gap="xs" wrap="nowrap">
          <IconCircle
            aria-hidden="true"
            size={ICON_SIZE}
            style={{ flexShrink: 0 }}
          />
          <Text flex={1} miw={0} size="sm">
            <VisuallyHidden>{t("discovery.notExplored")}: </VisuallyHidden>
            {pitch}
          </Text>
        </Group>
      </Anchor>
    </Box>
  );
};

type StatsExplorationProps = {
  history: SessionRecord[];
};

export const StatsExploration = ({ history }: StatsExplorationProps) => {
  const { t } = useTranslation();
  // `accept` is the only field used here. The hook still derives its own usage
  // and exploredCount internally — do NOT drop the derivations below in favour
  // of them: the header count and the ✓/○ rows must read from ONE usage object
  // so they can never disagree. `accept` owns the localStorage write + analytics
  // and so can't be pulled out of the hook.
  const { accept } = useFeatureDiscovery();
  const usage = useMemo(() => deriveFeatureUsage(history), [history]);
  // Same count as use-feature-discovery.ts:110-115, over the same usage — keeps
  // this header consistent with the home card's "{n} of N explored".
  const exploredCount = useMemo(
    () => SUGGESTION_CATALOG.filter((item) => item.isUsed(usage)).length,
    [usage]
  );

  // Routing the tap through `accept` also retires the item from the home card.
  // The grid stays tappable until a session is *completed* (✓/○ tracks `usage`,
  // never dismissed-state), so re-tapping re-fires the "accepted" analytics
  // event — the accepted cost of the requirement, isolated by the ":stats" label.
  const handleTry = (id: string) => accept(id, "stats");

  return (
    <>
      <Title order={2}>{t("discovery.explorationTitle")}</Title>
      <Text c="dimmed" size="sm">
        {t("discovery.progress", {
          explored: exploredCount,
          total: TOTAL_SUGGESTIONS,
        })}
      </Text>
      {/* Every catalog item shows regardless of `isApplicable`: this is a
          fixed-denominator completion map (N = TOTAL_SUGGESTIONS). Filtering by
          `isApplicable` (as the home card does) would shrink the visible set
          below N. An untried variant of an untried mode still deep-links fine. */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {ITEMS_BY_MODE.map(({ mode, items }) => (
          <Stack gap="xs" key={mode}>
            <Title order={3} size="h5">
              {t(MODE_LABELS[mode])}
            </Title>
            <Stack component="ul" gap="xs" role="list" style={LIST_RESET}>
              {items.map((item) => (
                <ExplorationRow
                  item={item}
                  key={item.id}
                  onTry={handleTry}
                  used={item.isUsed(usage)}
                />
              ))}
            </Stack>
          </Stack>
        ))}
      </SimpleGrid>
    </>
  );
};
