import { Image } from "@mantine/core";
import { BLANK_CARD_IMAGE } from "../constants";

export const NumberCard = ({
  number,
  width = 80,
  fontSize = 35,
}: {
  number: number;
  width?: number;
  fontSize?: number;
}) => (
  <div className="numberCardContainer" style={{ width }}>
    <Image src={BLANK_CARD_IMAGE} />
    <div className="numberCardTopLeft">{number}</div>
    <div className="numberCardCenter" style={{ fontSize }}>
      {number}
    </div>
    <div className="numberCardBottomRight">{number}</div>
  </div>
);
