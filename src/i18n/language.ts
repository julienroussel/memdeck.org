import i18n from "i18next";
import { LANGUAGE_LSK } from "../constants";

export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "de"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
} as const satisfies Record<SupportedLanguage, string>;

export const LANGUAGE_CODES = {
  en: "EN",
  fr: "FR",
  es: "ES",
  de: "DE",
} as const satisfies Record<SupportedLanguage, string>;

export const isSupportedLanguage = (lang: string): lang is SupportedLanguage =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);

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
};

let changeLanguageCallId = 0;

export const changeLanguage = async (
  lang: SupportedLanguage
): Promise<void> => {
  const callId = ++changeLanguageCallId;

  if (!i18n.hasResourceBundle(lang, "translation") && lang !== "en") {
    const loader = languageLoaders[lang];
    if (loader) {
      const module = await loader();
      if (callId !== changeLanguageCallId) {
        return;
      }
      i18n.addResourceBundle(lang, "translation", module.default);
    }
  }

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
