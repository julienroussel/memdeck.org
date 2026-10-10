import { Flex, Image } from "@mantine/core";
import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SPREAD_CARD_HEIGHT, SPREAD_CARD_WIDTH } from "../../constants";
import { useFormatCardName } from "../../hooks/use-format-card-name";
import type {
  CardSpreadCardsProps,
  CardSpreadProps,
} from "../../types/typeguards";
import { NumberCard } from "../number-card";
import { SpreadItem } from "./spread-item";
import { useSpreadOffset } from "./use-spread-offset";

const isCardsProps = (props: CardSpreadProps): props is CardSpreadCardsProps =>
  props.items.type === "cards";

export const CardSpread = memo((props: CardSpreadProps) => {
  const {
    items,
    canMove = true,
    height = "100%",
    degree = 15,
    hasCursor = false,
  } = props;
  const onCardClick = isCardsProps(props) ? props.onItemClick : undefined;
  const onNumberClick = isCardsProps(props) ? undefined : props.onItemClick;
  const numberLabel = isCardsProps(props) ? undefined : props.numberLabel;
  const isInteractive = props.onItemClick !== undefined;
  const { t } = useTranslation();
  const formatCardName = useFormatCardName();
  const {
    offset,
    handleFocus,
    handleKeyDown,
    handleMouseMove,
    handleTouchMove,
    handleTouchStart,
  } = useSpreadOffset({ canMove, itemCount: items.data.length });

  const handleCardButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const idx = Number(event.currentTarget.dataset.cardIndex);
      if (items.type !== "cards") {
        return;
      }
      const item = items.data[idx];
      if (item !== undefined) {
        onCardClick?.(item, idx);
      }
    },
    [items, onCardClick]
  );

  const handleNumberButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const idx = Number(event.currentTarget.dataset.numberIndex);
      if (items.type !== "numbers") {
        return;
      }
      const item = items.data[idx];
      if (item !== undefined) {
        onNumberClick?.(item, idx);
      }
    },
    [items, onNumberClick]
  );

  const getNumberAriaLabel = useCallback(
    (item: number) =>
      numberLabel === "distance"
        ? t("cardSpread.selectDistanceAriaLabel", { distance: item })
        : t("cardSpread.selectPositionAriaLabel", { position: item }),
    [numberLabel, t]
  );

  // Keys are position-based (not data-based) so that DOM buttons are reused
  // when switching between card and number items, preventing flicker.
  // The drag/keyboard offset is applied as a container-level CSS variable
  // (--offset, below), so per-item styles stay static and this memo keeps
  // drag updates from re-rendering all 52 buttons.
  const renderedItems = useMemo(
    () =>
      items.type === "cards"
        ? items.data.map((item, index) => (
            <SpreadItem
              hasCursor={hasCursor}
              index={index}
              // biome-ignore lint/suspicious/noArrayIndexKey: Position-based keys prevent DOM flicker when switching card/number items
              key={`spread_${index}`}
              kind="card"
              label={formatCardName(item)}
              onClick={isInteractive ? handleCardButtonClick : undefined}
              size={items.data.length / 2}
            >
              <Image
                alt=""
                h={SPREAD_CARD_HEIGHT}
                src={item.image}
                w={SPREAD_CARD_WIDTH}
              />
            </SpreadItem>
          ))
        : items.data.map((item, index) => (
            <SpreadItem
              hasCursor={hasCursor}
              index={index}
              // biome-ignore lint/suspicious/noArrayIndexKey: Position-based keys prevent DOM flicker when switching card/number items
              key={`spread_${index}`}
              kind="number"
              label={getNumberAriaLabel(item)}
              onClick={isInteractive ? handleNumberButtonClick : undefined}
              size={items.data.length / 2}
            >
              <NumberCard number={item} />
            </SpreadItem>
          )),
    [
      items,
      isInteractive,
      hasCursor,
      formatCardName,
      getNumberAriaLabel,
      handleCardButtonClick,
      handleNumberButtonClick,
    ]
  );

  return (
    <Flex
      align="start"
      aria-label={t("cardSpread.ariaLabel")}
      className="cardSpreadContainer"
      justify="center"
      mih={height}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      role="group"
      style={{ "--degree": `${degree}deg`, "--offset": offset }}
      // A display-only spread has no focusable items, so the container takes
      // the single tab stop that keeps arrow-key panning reachable.
      tabIndex={!isInteractive && canMove ? 0 : undefined}
    >
      {renderedItems}
    </Flex>
  );
});

CardSpread.displayName = "CardSpread";
