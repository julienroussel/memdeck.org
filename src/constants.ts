export const GITHUB_URL = "https://github.com/julienroussel/memdeck.org";
export const SELECTED_STACK_LSK = "memdeck-app-stack";
export const FLASHCARD_OPTION_LSK = "memdeck-app-flashcard-option";
export const FLASHCARD_TIMER_LSK = "memdeck-app-flashcard-timer";
export const ACAAN_TRAINER_TIMER_LSK = "memdeck-app-acaan-trainer-timer";
export const BLANK_CARD_IMAGE = "cards/blank_card.svg";
export const NOTIFICATION_CLOSE_TIMEOUT = 2000;

/** Total number of cards in a standard deck */
export const DECK_SIZE = 52;

/** Maximum attempts to find a unique random card before falling back to linear search */
export const MAX_RANDOM_ATTEMPTS = 100;

/** Default number of choices shown in flashcard exercises */
export const DEFAULT_CHOICES_COUNT = 5;

/** localStorage key for storing array of completed session records */
export const SESSION_HISTORY_LSK = "memdeck-app-session-history";

/** localStorage key for storing aggregated all-time statistics per mode and stack combination */
export const ALL_TIME_STATS_LSK = "memdeck-app-all-time-stats";

/** Maximum number of session records to retain in localStorage */
export const MAX_SESSION_HISTORY = 500;

export const CARD_ASPECT_RATIO = 333 / 234;
export const CARD_WIDTH = 120;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * CARD_ASPECT_RATIO);
export const SPREAD_CARD_WIDTH = 80;
export const SPREAD_CARD_HEIGHT = Math.round(
  SPREAD_CARD_WIDTH * CARD_ASPECT_RATIO
);

export const LANGUAGE_LSK = "memdeck-app-language";
export const SITE_NAME = "MemDeck";
export const SITE_URL = "https://memdeck.org";
