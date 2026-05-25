import type { TFunction } from "i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";

const DISPLAY_MODES = ["card", "index"] as const;

export type DisplayMode = (typeof DISPLAY_MODES)[number];

/** Randomly selects between "card" and "index" display modes for both-modes flashcard game. */
export const getRandomDisplayMode = (): DisplayMode => {
  const randomIndex = Math.floor(Math.random() * DISPLAY_MODES.length);
  const mode = DISPLAY_MODES[randomIndex];
  if (!mode) {
    throw new Error("DISPLAY_MODES array is empty or misconfigured");
  }
  return mode;
};

export const buildWrongAnswerNotification = (t: TFunction) => ({
  color: "red" as const,
  title: t("common.wrongAnswerTitle"),
  message: t("common.wrongAnswerMessage"),
  autoClose: NOTIFICATION_CLOSE_TIMEOUT,
});
