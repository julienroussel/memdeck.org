import { Badge, Image, Table, Text, useMatches } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { type MouseEvent, memo } from "react";
import { useTranslation } from "react-i18next";
import { CARD_ASPECT_RATIO } from "../../constants";
import type { PlayingCard } from "../../types/playingcard";
import type { Stack } from "../../types/stacks";
import type { SpellingEntry } from "./spell-card";
import { SpellingDetail } from "./spelling-detail";

const THUMBNAIL_WIDTH = 40;
const THUMBNAIL_HEIGHT = Math.round(THUMBNAIL_WIDTH * CARD_ASPECT_RATIO);
const CARD_CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 8,
} as const;
const ROW_CLICKABLE_STYLE = "clickableRow";
const TOGGLE_BUTTON_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "none",
  border: 0,
  padding: 0,
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
} as const;
const CHEVRON_EXPANDED_STYLE = {
  transition: "transform 200ms",
  transform: "rotate(90deg)",
} as const;
const CHEVRON_COLLAPSED_STYLE = {
  transition: "transform 200ms",
} as const;

type SpellingRowProps = {
  entry: SpellingEntry;
  isExpanded: boolean;
  onToggle: (position: number) => void;
  formatCardName: (card: PlayingCard) => string;
  stackOrder: Stack;
};

export const SpellingRow = memo(function SpellingRow({
  entry,
  isExpanded,
  onToggle,
  formatCardName,
  stackOrder,
}: SpellingRowProps) {
  const { t } = useTranslation();
  const detailId = `spelling-detail-${entry.position}`;
  const detailColSpan = useMatches({ base: 3, xs: 4 });

  // Pointer-only convenience; keyboard users toggle via the button in the
  // first cell (ARIA disclosure pattern).
  const handleRowClick = () => {
    onToggle(entry.position);
  };

  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle(entry.position);
  };

  return (
    <>
      <Table.Tr className={ROW_CLICKABLE_STYLE} onClick={handleRowClick}>
        <Table.Td>
          <button
            aria-controls={isExpanded ? detailId : undefined}
            aria-expanded={isExpanded}
            aria-label={`${entry.position}, ${formatCardName(entry.card)}`}
            onClick={handleToggleClick}
            style={TOGGLE_BUTTON_STYLE}
            type="button"
          >
            <IconChevronRight
              aria-hidden="true"
              size={14}
              style={
                isExpanded ? CHEVRON_EXPANDED_STYLE : CHEVRON_COLLAPSED_STYLE
              }
            />
            {entry.position}
          </button>
        </Table.Td>
        <Table.Td style={CARD_CELL_STYLE}>
          <Image
            alt=""
            h={THUMBNAIL_HEIGHT}
            src={entry.card.image}
            w={THUMBNAIL_WIDTH}
          />
          {formatCardName(entry.card)}
          {entry.isSelfSpelling && (
            <Badge color="green" size="xs" variant="light">
              {t("toolbox.spelling.selfSpelling")}
            </Badge>
          )}
        </Table.Td>
        <Table.Td>{entry.letterCount}</Table.Td>
        <Table.Td style={CARD_CELL_STYLE} visibleFrom="xs">
          {entry.landingCard ? (
            <>
              <Image
                alt=""
                h={THUMBNAIL_HEIGHT}
                src={entry.landingCard.image}
                w={THUMBNAIL_WIDTH}
              />
              {formatCardName(entry.landingCard)}
            </>
          ) : (
            "\u2014"
          )}
        </Table.Td>
      </Table.Tr>
      {isExpanded && (
        <Table.Tr>
          <Table.Td colSpan={detailColSpan} id={detailId} p={0}>
            <Text fw={500} mb="xs" p="sm" size="sm">
              {t("toolbox.spelling.detailTitle")}: {formatCardName(entry.card)}
            </Text>
            <SpellingDetail
              cardName={formatCardName(entry.card)}
              formatCardName={formatCardName}
              stackOrder={stackOrder}
            />
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
});
