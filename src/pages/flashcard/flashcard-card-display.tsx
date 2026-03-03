import { Center, Image } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { NumberCard } from "../../components/number-card";
import { CARD_HEIGHT, CARD_WIDTH } from "../../constants";
import type { PlayingCardPosition } from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";
import type { ResolvedDirection } from "../../utils/neighbor";

const CARD_VISIBLE_STYLE: CSSProperties = {
  visibility: "visible",
  position: "relative",
  top: 0,
  left: 0,
};

const CARD_HIDDEN_STYLE: CSSProperties = {
  visibility: "hidden",
  position: "absolute",
  top: 0,
  left: 0,
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

  return (
    <Center>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {isNeighborMode && (
          <IconChevronLeft
            aria-hidden={resolvedDirection !== "before" ? true : undefined}
            aria-label={t("flashcard.neighborArrowBefore")}
            role="img"
            size={48}
            style={{
              visibility: resolvedDirection === "before" ? "visible" : "hidden",
            }}
          />
        )}
        <div
          style={{
            position: "relative",
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
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
        {isNeighborMode && (
          <IconChevronRight
            aria-hidden={resolvedDirection !== "after" ? true : undefined}
            aria-label={t("flashcard.neighborArrowAfter")}
            role="img"
            size={48}
            style={{
              visibility: resolvedDirection === "after" ? "visible" : "hidden",
            }}
          />
        )}
      </div>
    </Center>
  );
};
