import type { useTranslation } from "react-i18next";
import type { FlashcardMode } from "../../types/flashcard";
import type { FlashcardPool } from "./flashcard-pool";

// The header names the focus list while one is set: the navbar range badge
// still shows the global range, which Flashcard is not using then.
export const getFlashcardSubtitle = (
  t: ReturnType<typeof useTranslation>["t"],
  mode: FlashcardMode,
  pool: FlashcardPool
): string => {
  const modeLabel =
    mode === "neighbor"
      ? t("flashcard.activeModeNeighbor")
      : t("flashcard.activeModePosition");
  return pool.kind === "focus"
    ? `${modeLabel} · ${t("flashcard.focusActive", { count: pool.positions.length })}`
    : modeLabel;
};
