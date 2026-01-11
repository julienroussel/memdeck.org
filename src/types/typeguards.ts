import type { PlayingCard } from "./playingcard";

export type CardSpreadProps = {
  items: PlayingCard[] | number[];
  canMove?: boolean;
  height?: string;
  degree?: number;
  onItemClick?: (item: PlayingCard | number, index: number) => void;
  hasCursor?: boolean;
};

export const isPlayingCard = (
  item: PlayingCard | number
): item is PlayingCard =>
  typeof item === "object" &&
  item !== null &&
  "suit" in item &&
  "rank" in item &&
  "image" in item;

const isNumber = (item: PlayingCard | number): item is number =>
  typeof item === "number";

export const isPlayingCardArray = (
  items: PlayingCard[] | number[]
): items is PlayingCard[] => items.every(isPlayingCard);

export const isNumberArray = (
  items: PlayingCard[] | number[]
): items is number[] => items.every(isNumber);
