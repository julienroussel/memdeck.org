import type { PlayingCard } from "../../types/playingcard";
import type { Stack } from "../../types/stacks";

type StackEntry = {
  position: number;
  card: PlayingCard;
};

export const filterStack = (
  stackOrder: Stack,
  query: string,
  formatName: (card: PlayingCard) => string
): StackEntry[] => {
  const entries: StackEntry[] = stackOrder.map((card, index) => ({
    position: index + 1,
    card,
  }));

  const trimmed = query.trim().toLowerCase();
  if (trimmed === "") {
    return entries;
  }

  return entries.filter(
    ({ position, card }) =>
      formatName(card).toLowerCase().includes(trimmed) ||
      String(position).includes(trimmed)
  );
};
