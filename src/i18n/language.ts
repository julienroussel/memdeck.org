import i18n from "i18next";
import { LANGUAGE_LSK, LOCALE_RELOAD_SSK } from "../constants";
import { includes } from "../utils/includes";
import { isStaleChunkError } from "../utils/stale-chunk";

export const SUPPORTED_LANGUAGES = [
  "en",
  "fr",
  "es",
  "de",
  "it",
  "nl",
  "pt",
] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  nl: "Nederlands",
  pt: "Português",
} as const satisfies Record<SupportedLanguage, string>;

export const LANGUAGE_CODES = {
  en: "EN",
  fr: "FR",
  es: "ES",
  de: "DE",
  it: "IT",
  nl: "NL",
  pt: "PT",
} as const satisfies Record<SupportedLanguage, string>;

export const isSupportedLanguage = (lang: string): lang is SupportedLanguage =>
  includes(SUPPORTED_LANGUAGES, lang);

export const detectLanguage = (): SupportedLanguage => {
  try {
    const stored = localStorage.getItem(LANGUAGE_LSK);
    if (stored && isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private browsing, sandboxed iframe, etc.)
  }

  const browserLang = navigator.language.split("-")[0];
  if (browserLang && isSupportedLanguage(browserLang)) {
    return browserLang;
  }

  return "en";
};

export const languageLoaders: Record<
  Exclude<SupportedLanguage, "en">,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  fr: () => import("./locales/fr.json"),
  es: () => import("./locales/es.json"),
  de: () => import("./locales/de.json"),
  it: () => import("./locales/it.json"),
  nl: () => import("./locales/nl.json"),
  pt: () => import("./locales/pt.json"),
};

/**
 * Force-update the service worker so the next page load serves fresh assets.
 * Waits for the new worker to activate before returning.
 */
async function updateServiceWorker(): Promise<void> {
  const registration = await navigator.serviceWorker?.getRegistration();
  if (!registration) {
    return;
  }

  await registration.update();

  const waiting = registration.waiting;
  if (!waiting) {
    return;
  }

  // Wait for the new worker to take over before reloading.
  // Race against a timeout so a stuck worker cannot hang the recovery.
  await Promise.race([
    new Promise<void>((resolve) => {
      waiting.addEventListener("statechange", () => {
        if (waiting.state === "activated" || waiting.state === "redundant") {
          resolve();
        }
      });
      // Skip waiting if it supports the message (Workbox convention).
      waiting.postMessage({ type: "SKIP_WAITING" });
    }),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 3000);
    }),
  ]);
}

/**
 * If the locale chunk 404s due to a stale deployment, update the service
 * worker and reload the page once to pick up the new assets. A sessionStorage
 * guard prevents infinite reload loops.
 *
 * @returns `true` if a reload was triggered (caller should bail out).
 */
async function reloadOnStaleChunk(error: unknown): Promise<boolean> {
  if (!isStaleChunkError(error)) {
    return false;
  }
  try {
    if (sessionStorage.getItem(LOCALE_RELOAD_SSK)) {
      return false;
    }
    sessionStorage.setItem(LOCALE_RELOAD_SSK, "1");
    try {
      await updateServiceWorker();
    } catch {
      // SW update failed — proceed with reload anyway
    }
    window.location.reload();
    return true;
  } catch {
    // sessionStorage unavailable — cannot guard against loops, so skip reload
    return false;
  }
}

function clearReloadGuard(): void {
  try {
    sessionStorage.removeItem(LOCALE_RELOAD_SSK);
  } catch {
    // sessionStorage unavailable
  }
}

let changeLanguageCallId = 0;

export const changeLanguage = async (
  lang: SupportedLanguage
): Promise<void> => {
  const callId = ++changeLanguageCallId;

  if (!i18n.hasResourceBundle(lang, "translation") && lang !== "en") {
    const loader = languageLoaders[lang];
    if (loader) {
      try {
        const module = await loader();
        if (callId !== changeLanguageCallId) {
          return;
        }
        i18n.addResourceBundle(lang, "translation", module.default);
      } catch (error: unknown) {
        if (await reloadOnStaleChunk(error)) {
          return;
        }
        throw error;
      }
    }
  }

  // Bundle loaded successfully — clear the reload guard so future
  // deployments can retry if another stale chunk appears.
  clearReloadGuard();

  await i18n.changeLanguage(lang);
  if (callId !== changeLanguageCallId) {
    return;
  }
  try {
    localStorage.setItem(LANGUAGE_LSK, lang);
  } catch {
    // localStorage may be unavailable (private browsing, sandboxed iframe, etc.)
  }
  document.documentElement.lang = lang;
};
