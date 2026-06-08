/**
 * Canonical list of supported language codes and the type derived from it.
 *
 * This is a dependency-free leaf module: it imports nothing, so it can be pulled
 * into a Node context (e.g. the `whats-new:draft` script, via the type chain
 * `whats-new.ts` → here) without dragging in i18next, analytics, or any other
 * browser-coupled runtime. `language.ts` imports both names; app consumers import them directly from this leaf.
 */
export const SUPPORTED_LANGUAGES = [
  "en",
  "fr",
  "es",
  "de",
  "it",
  "nl",
  "pt",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
