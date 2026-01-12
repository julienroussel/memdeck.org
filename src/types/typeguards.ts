import type { PlayingCard } from "./playingcard";

type BaseCardSpreadProps = {
  canMove?: boolean;
  height?: string;
  degree?: number;
  hasCursor?: boolean;
};

export type CardSpreadCardsProps = BaseCardSpreadProps & {
  items: { type: "cards"; data: PlayingCard[] };
  onItemClick?: (item: PlayingCard, index: number) => void;
};

type CardSpreadNumbersProps = BaseCardSpreadProps & {
  items: { type: "numbers"; data: number[] };
  onItemClick?: (item: number, index: number) => void;
};

export type CardSpreadProps = CardSpreadCardsProps | CardSpreadNumbersProps;

export const cardItems = (
  data: PlayingCard[]
): { type: "cards"; data: PlayingCard[] } => ({
  type: "cards",
  data,
});

export const numberItems = (
  data: number[]
): { type: "numbers"; data: number[] } => ({
  type: "numbers",
  data,
});

export const isPlayingCard = (
  item: PlayingCard | number
): item is PlayingCard =>
  typeof item === "object" &&
  item !== null &&
  "suit" in item &&
  "rank" in item &&
  "image" in item;
