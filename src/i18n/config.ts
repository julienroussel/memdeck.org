import type { InitOptions } from "i18next";
import en from "./locales/en.json";

/**
 * Shared i18next configuration used by both the app and the test setup.
 *
 * This ensures settings like fallbackLng, interpolation, and the English
 * resource bundle stay in sync without duplication.
 */
export const i18nConfig = {
  resources: {
    en: { translation: en },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
} as const satisfies InitOptions;
