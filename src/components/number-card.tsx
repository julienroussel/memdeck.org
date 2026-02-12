import { Image } from "@mantine/core";
import type { CSSProperties } from "react";
import { memo } from "react";
import { BLANK_CARD_IMAGE, CARD_ASPECT_RATIO } from "../constants";

type NumberCardProps = {
  /** The number to display on the card (1-52) */
  number: number;
  /** Card width in pixels */
  width?: number;
  /** Center number font size in pixels */
  fontSize?: number;
  /** Optional CSS styles for the container */
  style?: CSSProperties;
};

export const NumberCard = memo(function NumberCard({
  number,
  width = 80,
  fontSize = 35,
  style,
}: NumberCardProps) {
  return (
    <div
      className="numberCardContainer"
      data-testid="number-card"
      style={{ ...style, width }}
    >
      <Image h={Math.round(width * CARD_ASPECT_RATIO)} src={BLANK_CARD_IMAGE} />
      <div className="numberCardTopLeft">{number}</div>
      <div
        className="numberCardCenter"
        data-testid="number-card-value"
        style={{ fontSize }}
      >
        {number}
      </div>
      <div className="numberCardBottomRight">{number}</div>
    </div>
  );
});
