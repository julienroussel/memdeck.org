import { Center, Image } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { NumberCard } from "../../components/number-card";
import { CARD_HEIGHT, CARD_WIDTH } from "../../constants";
import { useFormatCardName } from "../../hooks/use-format-card-name";
import type { PlayingCardPosition } from "../../types/stacks";
import type { ResolvedDirection } from "../../utils/neighbor";

const CARD_VISIBLE_STYLE: CSSProperties = {
  left: 0,
  position: "relative",
  top: 0,
  visibility: "visible",
};

const CARD_HIDDEN_STYLE: CSSProperties = {
  left: 0,
  position: "absolute",
  top: 0,
  visibility: "hidden",
};

type FlashcardCardDisplayProps = {
  card: PlayingCardPosition;
  shouldShowCard: boolean;
  isNeighborMode: boolean;
  resolvedDirection: ResolvedDirection | null;
};

export const FlashcardCardDisplay = ({
  card,
  shouldShowCard,
  isNeighborMode,
  resolvedDirection,
}: FlashcardCardDisplayProps) => {
  const { t } = useTranslation();
  const formatCardName = useFormatCardName();

  return (
    <Center>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 12,
        }}
      >
        {isNeighborMode ? (
          <IconChevronLeft
            aria-hidden={resolvedDirection === "before" ? undefined : true}
            aria-label={t("flashcard.neighborArrowBefore")}
            role="img"
            size={48}
            style={{
              visibility: resolvedDirection === "before" ? "visible" : "hidden",
            }}
          />
        ) : null}
        <div
          style={{
            height: CARD_HEIGHT,
            position: "relative",
            width: CARD_WIDTH,
          }}
        >
          <div aria-hidden={!shouldShowCard}>
            <Image
              alt={formatCardName(card.card)}
              className="cardShadow"
              h={CARD_HEIGHT}
              src={card.card.image}
              style={shouldShowCard ? CARD_VISIBLE_STYLE : CARD_HIDDEN_STYLE}
              w={CARD_WIDTH}
            />
          </div>
          <div aria-hidden={shouldShowCard}>
            <NumberCard
              fontSize={60}
              number={card.index}
              style={shouldShowCard ? CARD_HIDDEN_STYLE : CARD_VISIBLE_STYLE}
              width={CARD_WIDTH}
            />
          </div>
        </div>
        {isNeighborMode ? (
          <IconChevronRight
            aria-hidden={resolvedDirection === "after" ? undefined : true}
            aria-label={t("flashcard.neighborArrowAfter")}
            role="img"
            size={48}
            style={{
              visibility: resolvedDirection === "after" ? "visible" : "hidden",
            }}
          />
        ) : null}
      </div>
    </Center>
  );
};
