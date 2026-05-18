export const GITHUB_URL = "https://github.com/julienroussel/memdeck.org";
export const LLMS_TXT_PATH = "/llms.txt";
export const LINKTREE_URL = "https://linktr.ee/julien.roussel";
export const MAGIC_LAB_URL = "https://themagiclab.app";
export const SELECTED_STACK_LSK = "memdeck-app-stack";
export const FLASHCARD_OPTION_LSK = "memdeck-app-flashcard-option";
export const FLASHCARD_TIMER_LSK = "memdeck-app-flashcard-timer";
export const ACAAN_TRAINER_TIMER_LSK = "memdeck-app-acaan-trainer-timer";
export const COLOR_SCHEME_LSK = "memdeck-app-color-scheme";
export const BLANK_CARD_IMAGE = "/cards/blank_card.svg";
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

/**
 * localStorage key for a "last save failed" breadcrumb. Set when the
 * unmount/beforeunload auto-save path fails (no UI available at that point);
 * read on next session start so the user is told the prior session wasn't
 * saved. Cleared as soon as it's surfaced.
 */
export const LAST_SAVE_FAILED_LSK = "memdeck-app-last-save-failed";

export const CARD_ASPECT_RATIO = 333 / 234;
export const CARD_WIDTH = 120;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * CARD_ASPECT_RATIO);
export const SPREAD_CARD_WIDTH = 100;
export const SPREAD_CARD_HEIGHT = Math.round(
  SPREAD_CARD_WIDTH * CARD_ASPECT_RATIO
);

export const SPOT_CHECK_MODE_LSK = "memdeck-app-spot-check-mode";
export const SPOT_CHECK_TIMER_LSK = "memdeck-app-spot-check-timer";
export const NEIGHBOR_DIRECTION_LSK = "memdeck-app-neighbor-direction";
export const DISTANCE_OPTION_LSK = "memdeck-app-distance-option";
export const DISTANCE_CONVENTION_LSK = "memdeck-app-distance-convention";
export const DISTANCE_TIMER_LSK = "memdeck-app-distance-timer";
export const LANGUAGE_LSK = "memdeck-app-language";
export const TOOLBOX_SECTIONS_LSK = "memdeck-app-toolbox-sections";

/** sessionStorage key prefix for tracking chunk reload attempts */
export const CHUNK_RELOAD_SSK = "memdeck-chunk-reload:";

/** sessionStorage key for tracking locale chunk reload attempts */
export const LOCALE_RELOAD_SSK = "memdeck-locale-reload";

/**
 * sessionStorage key for the "last-save-failed notification has been shown"
 * sentinel. Stores the breadcrumb's failedAt ISO string so a new breadcrumb
 * (different timestamp) naturally invalidates the sentinel. Used by
 * useSession to suppress the notification across mounts in the same tab
 * when clearLastSaveFailedBreadcrumb cannot persist (issue #629).
 */
export const LAST_SAVE_FAILED_SHOWN_SSK = "memdeck-app-last-save-failed-shown";

export const COMMIT_HASH_LSK = "memdeck-app-commit-hash";
export const UPDATE_NOTIFIED_AT_LSK = "memdeck-app-update-notified-at";
export const PWA_UPDATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const PWA_UPDATE_TOAST_TIMEOUT = 5000;

export const PWA_INSTALL_DISMISSED_AT_LSK =
  "memdeck-app-pwa-install-dismissed-at";
export const PWA_INSTALL_PERMANENTLY_DISMISSED_LSK =
  "memdeck-app-pwa-install-permanently-dismissed";
export const PWA_INSTALL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export const SITE_NAME = "MemDeck";
export const SITE_URL = "https://memdeck.org";

/** localStorage key for tracking whether the "spread the word" nudge was dismissed */
export const SHARE_NUDGE_DISMISSED_LSK = "memdeck-app-share-nudge-dismissed";

/** Minimum number of completed sessions before showing the share nudge */
export const SHARE_NUDGE_MIN_SESSIONS = 5;

export const STACK_LIMITS_LSK = "memdeck-app-stack-limits";
export const MIN_FLASHCARD_RANGE = 6;
export const MIN_SPOT_CHECK_RANGE = 10;
export const MIN_DISTANCE_RANGE = 6;
export const RANGE_PRESETS = [13, 26, 39, 52] as const;

/** Canonical route format — leading + trailing slash, so consumers (sitemap, internal links) never trip a 301 redirect. */
type RoutePath = "/" | `/${string}/`;

/** All route paths used by the app — shared between routes.tsx and the pre-render script */
export const ROUTES = {
  home: "/",
  guide: "/guide/",
  resources: "/resources/",
  faq: "/faq/",
  flashcard: "/flashcard/",
  spotCheck: "/spot-check/",
  acaan: "/acaan/",
  distance: "/distance/",
  toolbox: "/toolbox/",
  stats: "/stats/",
  about: "/about/",
} as const satisfies Record<string, RoutePath>;
