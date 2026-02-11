import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { i18nConfig } from "./config";
import { changeLanguage, detectLanguage } from "./language";
import "./types";

const detectedLng = detectLanguage();

// Initialize synchronously with bundled English — no async gap before first paint.
// Set lng to the detected language so i18next knows the target from the start;
// non-English bundles are lazy-loaded below but fallbackLng covers the gap.
i18n
  .use(initReactI18next)
  .init({ ...i18nConfig, lng: detectedLng, initImmediate: false });

// Always start with "en" since English is the bundled fallback rendered during
// the loading gap.  Once changeLanguage() finishes below it will set the
// correct lang attribute — avoiding a mismatch that trips up screen readers.
document.documentElement.lang = "en";

/** Resolves once the detected language bundle is loaded (no-op for English). */
export const languageReady: Promise<void> = (async () => {
  if (detectedLng !== "en") {
    await changeLanguage(detectedLng);
  }
})();

// Suppress unhandled rejection — LanguageLoadNotifier handles the user notification.
languageReady.catch(() => {
  // intentional no-op
});
