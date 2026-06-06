import type { SupportedLanguage } from "../i18n/language";

/**
 * Formats an ISO 8601 instant as a localized date + time string. No `timeZone`
 * option is passed, so the result is rendered in the viewer's local timezone.
 * Uses `dateStyle`/`timeStyle` so the exact format follows each locale's ICU
 * conventions rather than a hand-rolled pattern.
 */
export const formatReleaseDate = (
  iso: string,
  lang: SupportedLanguage
): string =>
  new Date(iso).toLocaleString(lang, {
    dateStyle: "medium",
    timeStyle: "short",
  });
