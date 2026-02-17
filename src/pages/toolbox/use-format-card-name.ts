import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { PlayingCard } from "../../types/playingcard";

export const useFormatCardName = () => {
  const { t } = useTranslation();
  return useCallback(
    (card: PlayingCard): string => {
      const rank = t(`cards.ranks.${card.rank}`);
      const suit = t(`cards.suits.${card.suit}`);
      return t("cards.name", { rank, suit });
    },
    [t]
  );
};
