import { Image } from "@mantine/core";
import type { CSSProperties } from "react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
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
  width = 100,
  fontSize = 35,
  style,
}: NumberCardProps) {
  const { t } = useTranslation();

  return (
    <div
      aria-label={t("numberCard.ariaLabel", { number })}
      className="numberCardContainer"
      data-testid="number-card"
      role="img"
      style={{ ...style, width }}
    >
      <Image
        alt=""
        h={Math.round(width * CARD_ASPECT_RATIO)}
        src={BLANK_CARD_IMAGE}
      />
      <div aria-hidden="true" className="numberCardTopLeft">
        {number}
      </div>
      <div
        aria-hidden="true"
        className="numberCardCenter"
        data-testid="number-card-value"
        style={{ fontSize }}
      >
        {number}
      </div>
      <div aria-hidden="true" className="numberCardBottomRight">
        {number}
      </div>
    </div>
  );
});
