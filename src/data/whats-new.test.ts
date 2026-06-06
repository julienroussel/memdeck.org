import { describe, expect, it } from "vitest";
import { SUPPORTED_LANGUAGES } from "../i18n/language";
import { WHATS_NEW_ENTRIES } from "./whats-new";

describe("WHATS_NEW_ENTRIES", () => {
  it("has unique ids", () => {
    const ids = WHATS_NEW_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at most 20 entries", () => {
    expect(WHATS_NEW_ENTRIES.length).toBeLessThanOrEqual(20);
  });

  it("has a valid, parseable releasedAt for every entry", () => {
    for (const entry of WHATS_NEW_ENTRIES) {
      expect(Number.isNaN(Date.parse(entry.releasedAt))).toBe(false);
    }
  });

  it("is sorted newest-first by releasedAt", () => {
    const times = WHATS_NEW_ENTRIES.map((entry) =>
      Date.parse(entry.releasedAt)
    );
    const sortedDesc = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sortedDesc);
  });

  it("has a non-empty title in all supported languages", () => {
    for (const entry of WHATS_NEW_ENTRIES) {
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(entry.title[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has a non-empty body in all supported languages when present", () => {
    // Forward-looking guard: no seed entry carries a body yet, so this loop is
    // vacuous today and activates when the first body-bearing entry is added.
    // WhatsNewEntryCard's body rendering is covered in its own test.
    for (const entry of WHATS_NEW_ENTRIES) {
      if (!entry.body) {
        continue;
      }
      for (const lang of SUPPORTED_LANGUAGES) {
        expect(entry.body[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
