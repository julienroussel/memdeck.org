import { describe, expect, it, vi } from "vitest";
import type { WhatsNewEntry } from "../data/whats-new";
import type { SupportedLanguage } from "../i18n/supported-languages";
import { renderWhatsNewForLlms } from "./render-whats-new-llms";

// The renderer only reads the `en` copy, but the type requires every language;
// fill them all from one string. No `as` cast — the literal proves full coverage.
const allLangs = (s: string): Record<SupportedLanguage, string> => ({
  en: s,
  fr: s,
  es: s,
  de: s,
  it: s,
  nl: s,
  pt: s,
});

const makeEntry = (
  releasedAt: string,
  type: WhatsNewEntry["type"],
  en: string,
  bodyEn?: string
): WhatsNewEntry => {
  const entry: WhatsNewEntry = {
    id: releasedAt,
    releasedAt,
    type,
    title: allLangs(en),
  };
  if (bodyEn) {
    entry.body = allLangs(bodyEn);
  }
  return entry;
};

describe("renderWhatsNewForLlms", () => {
  it("renders newest-first, dated YYYY-MM-DD with the type label", () => {
    const out = renderWhatsNewForLlms(
      [
        makeEntry("2026-06-05T09:00:00Z", "feature", "Newer thing."),
        makeEntry("2026-05-01T09:00:00Z", "fix", "Older thing."),
      ],
      10
    );

    expect(out).toBe(
      "- 2026-06-05 (feature): Newer thing.\n- 2026-05-01 (fix): Older thing."
    );
  });

  it("sorts newest-first even when input is out of order", () => {
    const out = renderWhatsNewForLlms(
      [
        makeEntry("2026-05-01T09:00:00Z", "fix", "Older."),
        makeEntry("2026-06-05T09:00:00Z", "feature", "Newer."),
      ],
      10
    );

    expect(out).toBe(
      "- 2026-06-05 (feature): Newer.\n- 2026-05-01 (fix): Older."
    );
  });

  it("orders same-day entries by time-of-day, latest first", () => {
    // Mirrors the real data: two 2026-05-25 entries at different instants. Guards
    // against weakening the sort key from the full instant to the YYYY-MM-DD date
    // (which would make these compare equal and leave order to input/stability).
    const out = renderWhatsNewForLlms(
      [
        makeEntry("2026-05-25T10:00:00Z", "feature", "Morning."),
        makeEntry("2026-05-25T14:00:00Z", "stack", "Afternoon."),
      ],
      10
    );

    expect(out).toBe(
      "- 2026-05-25 (stack): Afternoon.\n- 2026-05-25 (feature): Morning."
    );
  });

  it("caps at the limit, keeping the most recent", () => {
    const out = renderWhatsNewForLlms(
      [
        makeEntry("2026-06-03T00:00:00Z", "feature", "Three."),
        makeEntry("2026-06-02T00:00:00Z", "feature", "Two."),
        makeEntry("2026-06-01T00:00:00Z", "feature", "One."),
      ],
      2
    );

    expect(out).toBe(
      "- 2026-06-03 (feature): Three.\n- 2026-06-02 (feature): Two."
    );
  });

  it("returns all entries when the limit exceeds the count", () => {
    const out = renderWhatsNewForLlms(
      [makeEntry("2026-06-01T00:00:00Z", "stack", "Only.")],
      10
    );

    expect(out).toBe("- 2026-06-01 (stack): Only.");
  });

  it("returns an empty string for a non-positive limit", () => {
    const entries = [makeEntry("2026-06-01T00:00:00Z", "feature", "X.")];

    expect(renderWhatsNewForLlms(entries, 0)).toBe("");
    expect(renderWhatsNewForLlms(entries, -3)).toBe("");
  });

  it("returns an empty string when there are no entries", () => {
    expect(renderWhatsNewForLlms([], 10)).toBe("");
  });

  it("derives the UTC date even when the local timezone is a day ahead", () => {
    // 2026-05-25T23:00:00Z is 2026-05-26 08:00 in Asia/Tokyo (UTC+9). A local-date
    // formatter would render 05-26; the renderer must stay on the UTC calendar day.
    vi.stubEnv("TZ", "Asia/Tokyo");
    try {
      const out = renderWhatsNewForLlms(
        [makeEntry("2026-05-25T23:00:00Z", "stack", "Late in the day.")],
        10
      );

      expect(out).toBe("- 2026-05-25 (stack): Late in the day.");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("appends the body when present and omits it when absent", () => {
    const out = renderWhatsNewForLlms(
      [
        makeEntry(
          "2026-06-02T00:00:00Z",
          "feature",
          "Has body.",
          "Extra detail."
        ),
        makeEntry("2026-06-01T00:00:00Z", "feature", "No body."),
      ],
      10
    );

    expect(out).toBe(
      "- 2026-06-02 (feature): Has body. Extra detail.\n- 2026-06-01 (feature): No body."
    );
  });
});
