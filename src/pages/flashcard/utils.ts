import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";

type DisplayMode = "card" | "index";

const DISPLAY_MODES: DisplayMode[] = ["card", "index"];

/** Randomly selects between "card" and "index" display modes for both-modes flashcard game. */
export const getRandomDisplayMode = (): DisplayMode => {
  const randomIndex = Math.floor(Math.random() * DISPLAY_MODES.length);
  const mode = DISPLAY_MODES[randomIndex];
  if (!mode) {
    throw new Error("DISPLAY_MODES array is empty or misconfigured");
  }
  return mode;
};

export const wrongAnswerNotification = {
  color: "red",
  title: "Wrong answer",
  message: "Try again!",
  autoClose: NOTIFICATION_CLOSE_TIMEOUT,
};
