import { Flex, Image } from "@mantine/core";
import type { KeyboardEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SPREAD_CARD_HEIGHT, SPREAD_CARD_WIDTH } from "../../constants";
import { useFormatCardName } from "../../hooks/use-format-card-name";
import type {
  CardSpreadCardsProps,
  CardSpreadProps,
} from "../../types/typeguards";
import { cssVarCounterStyle } from "../../utils/style";
import { NumberCard } from "../number-card";

const isCardsProps = (props: CardSpreadProps): props is CardSpreadCardsProps =>
  props.items.type === "cards";

const KEYBOARD_STEP = 3;

export const CardSpread = memo(function CardSpread(props: CardSpreadProps) {
  const {
    items,
    canMove = true,
    height = "100%",
    degree = 15,
    hasCursor = false,
  } = props;
  const onCardClick = isCardsProps(props) ? props.onItemClick : undefined;
  const onNumberClick = isCardsProps(props) ? undefined : props.onItemClick;
  const { t } = useTranslation();
  const formatCardName = useFormatCardName();
  const [offset, setOffset] = useState(0);
  const touchLastPositionRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const movementAccumulatorRef = useRef(0);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      movementAccumulatorRef.current = 0;
    },
    []
  );

  const updateOffset = useCallback(
    (movementX: number) => {
      const maxOffset = items.data.length / 2;
      setOffset((prev) => {
        if (movementX < 0 && prev > -maxOffset) {
          return prev - 1;
        }
        if (movementX > 0 && prev < maxOffset) {
          return prev + 1;
        }
        return prev;
      });
    },
    [items.data.length]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (canMove && e.buttons === 1) {
        movementAccumulatorRef.current += e.nativeEvent.movementX;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            const accumulated = movementAccumulatorRef.current;
            movementAccumulatorRef.current = 0;
            updateOffset(accumulated);
            rafRef.current = null;
          });
        }
      }
    },
    [canMove, updateOffset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (canMove && e.touches.length === 1) {
        const touch = e.nativeEvent.touches[0];
        if (!touch) {
          return;
        }
        const movementX = touch.screenX - touchLastPositionRef.current;
        touchLastPositionRef.current = touch.screenX;
        movementAccumulatorRef.current += movementX;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            const accumulated = movementAccumulatorRef.current;
            movementAccumulatorRef.current = 0;
            updateOffset(accumulated);
            rafRef.current = null;
          });
        }
      }
    },
    [canMove, updateOffset]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!canMove) {
        return;
      }

      const maxOffset = items.data.length / 2;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setOffset((prev) => Math.max(prev - KEYBOARD_STEP, -maxOffset));
          break;
        case "ArrowRight":
          event.preventDefault();
          setOffset((prev) => Math.min(prev + KEYBOARD_STEP, maxOffset));
          break;
        default:
          break;
      }
    },
    [canMove, items.data.length]
  );

  const handleCardItemClick = useCallback(
    (item: CardSpreadCardsProps["items"]["data"][number], index: number) => {
      onCardClick?.(item, index);
    },
    [onCardClick]
  );

  const handleNumberItemClick = useCallback(
    (item: number, index: number) => {
      onNumberClick?.(item, index);
    },
    [onNumberClick]
  );

  const handleCardButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const idx = Number(event.currentTarget.dataset.cardIndex);
      if (items.type !== "cards") {
        return;
      }
      const item = items.data[idx];
      if (item !== undefined) {
        handleCardItemClick(item, idx);
      }
    },
    [items, handleCardItemClick]
  );

  const handleNumberButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const idx = Number(event.currentTarget.dataset.numberIndex);
      if (items.type !== "numbers") {
        return;
      }
      const item = items.data[idx];
      if (item !== undefined) {
        handleNumberItemClick(item, idx);
      }
    },
    [items, handleNumberItemClick]
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
            <button
              aria-label={formatCardName(item)}
              className="cardSpreadCard"
              data-card-index={index}
              // biome-ignore lint/suspicious/noArrayIndexKey: Position-based keys prevent DOM flicker when switching card/number items
              key={`spread_${index}`}
              onClick={handleCardButtonClick}
              style={{
                cursor: hasCursor ? "pointer" : "default",
                ...cssVarCounterStyle(index, items.data.length / 2, 0),
              }}
              type="button"
            >
              <Image
                alt=""
                h={SPREAD_CARD_HEIGHT}
                src={item.image}
                w={SPREAD_CARD_WIDTH}
              />
            </button>
          ))
        : items.data.map((item, index) => (
            <button
              aria-label={t("cardSpread.selectPositionAriaLabel", {
                position: item,
              })}
              className="cardSpreadCard"
              data-number-index={index}
              // biome-ignore lint/suspicious/noArrayIndexKey: Position-based keys prevent DOM flicker when switching card/number items
              key={`spread_${index}`}
              onClick={handleNumberButtonClick}
              style={{
                cursor: hasCursor ? "pointer" : "default",
                ...cssVarCounterStyle(index, items.data.length / 2, 0),
              }}
              type="button"
            >
              <NumberCard number={item} />
            </button>
          )),
    [
      items,
      hasCursor,
      formatCardName,
      t,
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
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      role="group"
      style={{ "--degree": `${degree}deg`, "--offset": offset }}
    >
      {renderedItems}
    </Flex>
  );
});
