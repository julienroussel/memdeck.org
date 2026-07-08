import type { PlayingCard, Rank, Suit } from "../types/playingcard";

const RANK_NAMES: Record<Rank, string> = {
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
  "10": "Ten",
  A: "Ace",
  J: "Jack",
  K: "King",
  Q: "Queen",
};

const SUIT_NAMES: Record<Suit, string> = {
  clubs: "Clubs",
  diamonds: "Diamonds",
  hearts: "Hearts",
  spades: "Spades",
};

// English-only fixture for unit tests. Production code must use the
// `useFormatCardName` hook for proper i18n.
export const formatCardName = (card: PlayingCard): string => {
  const rankName = RANK_NAMES[card.rank];
  const suitName = SUIT_NAMES[card.suit];
  return `${rankName} of ${suitName}`;
};
