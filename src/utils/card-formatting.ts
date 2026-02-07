import type { PlayingCard, Rank, Suit } from "../types/playingcard";

const RANK_NAMES: Record<Rank, string> = {
  A: "Ace",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "Jack",
  Q: "Queen",
  K: "King",
};

const SUIT_NAMES: Record<Suit, string> = {
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
  spades: "Spades",
};

export const formatCardName = (card: PlayingCard): string => {
  const rankName = RANK_NAMES[card.rank];
  const suitName = SUIT_NAMES[card.suit];
  return `${rankName} of ${suitName}`;
};
