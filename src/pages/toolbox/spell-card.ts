import type { PlayingCard } from "../../types/playingcard";
import type { Stack } from "../../types/stacks";

export type SpellingEntry = {
  position: number;
  card: PlayingCard;
  letterCount: number;
  landingCard: PlayingCard | undefined;
  isSelfSpelling: boolean;
};

export const getLetterCount = (name: string): number =>
  name.replaceAll(" ", "").length;

export const getSpellingData = (
  stackOrder: Stack,
  formatName: (card: PlayingCard) => string
): SpellingEntry[] =>
  stackOrder.map((card, index) => {
    const letterCount = getLetterCount(formatName(card));
    const landingCard =
      letterCount >= 1 && letterCount <= 52
        ? stackOrder[letterCount - 1]
        : undefined;
    return {
      card,
      isSelfSpelling: landingCard === card,
      landingCard,
      letterCount,
      position: index + 1,
    };
  });
