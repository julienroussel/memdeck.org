import { Image } from "@mantine/core";
import { BLANK_CARD_IMAGE } from "../constants";

type NumberCardProps = {
  /** The number to display on the card (1-52) */
  number: number;
  /** Card width in pixels */
  width?: number;
  /** Center number font size in pixels */
  fontSize?: number;
};

export const NumberCard = ({
  number,
  width = 80,
  fontSize = 35,
}: NumberCardProps) => (
  <div className="numberCardContainer" style={{ width }}>
    <Image src={BLANK_CARD_IMAGE} />
    <div className="numberCardTopLeft">{number}</div>
    <div className="numberCardCenter" style={{ fontSize }}>
      {number}
    </div>
    <div className="numberCardBottomRight">{number}</div>
  </div>
);
