import { PlayingCard } from './playingcard';

export type CardSpreadProps = {
  items: PlayingCard[] | number[];
  canMove?: boolean;
  height?: string;
  degree?: number;
  onItemClick?: (item: PlayingCard | number, index: number) => void;
};

export const isPlayingCard = (
  item: PlayingCard | number,
): item is PlayingCard => {
  return (item as PlayingCard).suit !== undefined;
};

const isNumber = (item: PlayingCard | number): item is number => {
  return typeof item === 'number';
};

export const isPlayingCardArray = (
  items: PlayingCard[] | number[],
): items is PlayingCard[] => {
  return items.every(isPlayingCard);
};

export const isNumberArray = (
  items: PlayingCard[] | number[],
): items is number[] => {
  return items.every(isNumber);
};
