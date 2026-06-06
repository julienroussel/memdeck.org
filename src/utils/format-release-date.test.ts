import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "../i18n/language";
import { formatReleaseDate } from "./format-release-date";

// A fixed mid-year, mid-day instant. Assertions stay timezone-independent (no
// exact ICU output is checked) so the test passes regardless of the machine's TZ.
const ISO = "2026-06-05T13:30:00Z";
const TIME_PATTERN = /\d{1,2}:\d{2}/;

describe("formatReleaseDate", () => {
  it("includes a time component (hours:minutes)", () => {
    expect(formatReleaseDate(ISO, "en")).toMatch(TIME_PATTERN);
  });

  it("is locale-sensitive (English differs from German)", () => {
    expect(formatReleaseDate(ISO, "en")).not.toBe(formatReleaseDate(ISO, "de"));
  });

  it("returns a non-empty, year-bearing string for every supported language", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const formatted = formatReleaseDate(ISO, lang);
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).toContain("2026");
    }
  });
});
