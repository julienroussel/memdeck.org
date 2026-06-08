import type { WhatsNewEntry } from "../data/whats-new";

/**
 * Renders the most-recent `limit` changelog entries as an English plain-text
 * block for llms-full.txt. Locale-neutral by design: ISO `YYYY-MM-DD` dates and
 * the `en` copy, so crawlers get a stable, timezone-free view. Sorts newest-first
 * defensively, so it doesn't depend on the data module's ordering invariant.
 */
export const renderWhatsNewForLlms = (
  entries: readonly WhatsNewEntry[],
  limit: number
): string =>
  [...entries]
    .sort((a, b) => Date.parse(b.releasedAt) - Date.parse(a.releasedAt))
    .slice(0, Math.max(0, limit))
    .map((entry) => {
      const date = new Date(entry.releasedAt).toISOString().slice(0, 10);
      const line = `- ${date} (${entry.type}): ${entry.title.en}`;
      const body = entry.body?.en;
      return body ? `${line} ${body}` : line;
    })
    .join("\n");
