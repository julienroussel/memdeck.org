import { Button, Group, Table, Text, Title } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionRecord } from "../../types/session";
import type { SpotCheckMode } from "../../types/spot-check";
import { stacks } from "../../types/stacks";
import {
  formatDuration,
  toAccuracyPercent,
} from "../../utils/session-formatting";
import { MODE_LABELS, type StatsI18nKey } from "./stats-i18n";

export const PAGE_SIZE = 20;

type StatsHistoryProps = {
  history: SessionRecord[];
};

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SPOT_CHECK_SUB_MODE_KEYS = {
  missing: "stats.subModeMissing",
  swapped: "stats.subModeSwapped",
  moved: "stats.subModeMoved",
} as const satisfies Record<SpotCheckMode, StatsI18nKey>;

const formatModeLabel = (
  record: SessionRecord,
  t: (key: StatsI18nKey) => string
): string => {
  const baseLabel = t(MODE_LABELS[record.mode]);
  if (record.mode === "flashcard" && record.flashcardMode !== undefined) {
    const subMode =
      record.flashcardMode === "neighbor"
        ? t("stats.subModeNeighbor")
        : t("stats.subModePosition");
    return `${baseLabel} · ${subMode}`;
  }
  if (record.mode === "spotcheck" && record.spotCheckMode !== undefined) {
    return `${baseLabel} · ${t(SPOT_CHECK_SUB_MODE_KEYS[record.spotCheckMode])}`;
  }
  return baseLabel;
};

export const StatsHistory = ({ history }: StatsHistoryProps) => {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleHistory = history.slice(0, visibleCount);
  const handleShowMore = () => setVisibleCount((prev) => prev + PAGE_SIZE);

  if (history.length === 0) {
    return (
      <Text c="dimmed" ta="center">
        {t("stats.noSessions")}
      </Text>
    );
  }

  const hasMore = visibleCount < history.length;

  return (
    <>
      <Title order={3}>{t("stats.sessionHistory")}</Title>
      <Text c="dimmed" hiddenFrom="sm" size="xs">
        {t("common.moreColumnsOnWiderScreen")}
      </Text>
      <Table striped>
        <Table.Caption>{t("stats.sessionHistoryCaption")}</Table.Caption>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("stats.date")}</Table.Th>
            <Table.Th>{t("stats.mode")}</Table.Th>
            <Table.Th visibleFrom="xs">{t("stats.stack")}</Table.Th>
            <Table.Th ta="center" visibleFrom="xs">
              {t("stats.score")}
            </Table.Th>
            <Table.Th ta="center">{t("common.accuracy")}</Table.Th>
            <Table.Th ta="center" visibleFrom="sm">
              {t("common.bestStreak")}
            </Table.Th>
            <Table.Th ta="center" visibleFrom="sm">
              {t("common.duration")}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visibleHistory.map((record) => (
            <Table.Tr key={record.id}>
              <Table.Td>{formatDate(record.startedAt)}</Table.Td>
              <Table.Td>{formatModeLabel(record, t)}</Table.Td>
              <Table.Td visibleFrom="xs">
                {stacks[record.stackKey]?.name ?? record.stackKey}
              </Table.Td>
              <Table.Td ta="center" visibleFrom="xs">
                {record.successes}/{record.questionsCompleted}
              </Table.Td>
              <Table.Td ta="center">
                {toAccuracyPercent(record.accuracy)}%
              </Table.Td>
              <Table.Td ta="center" visibleFrom="sm">
                {record.bestStreak}
              </Table.Td>
              <Table.Td ta="center" visibleFrom="sm">
                {formatDuration(record.durationSeconds)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {hasMore && (
        <Group justify="center" mt="sm">
          <Button onClick={handleShowMore} size="compact-sm" variant="subtle">
            {t("common.showMore")}
          </Button>
        </Group>
      )}
    </>
  );
};
