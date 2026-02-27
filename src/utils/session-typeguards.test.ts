import { describe, expect, it } from "vitest";
import { makeSessionRecord as makeRecord } from "../test-utils/session-factories";
import type { AllTimeStats } from "../types/session";
import { createEmptyStatsEntry } from "./session-stats";
import {
  isAllTimeStats,
  isSessionRecord,
  isSessionRecordArray,
  isStatsKey,
} from "./session-typeguards";

describe("isSessionRecord", () => {
  it("returns true for valid session record", () => {
    expect(isSessionRecord(makeRecord())).toBe(true);
  });

  it("returns false for null", () => {
    expect(isSessionRecord(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isSessionRecord("string")).toBe(false);
  });

  it("returns false for missing fields", () => {
    expect(isSessionRecord({ id: "test" })).toBe(false);
  });

  it("returns false when config has an invalid type", () => {
    const { config: _, ...withoutConfig } = makeRecord();
    const withBadConfig = { ...withoutConfig, config: { type: "invalid" } };
    expect(isSessionRecord(withBadConfig)).toBe(false);
  });

  it("returns false when config is missing entirely", () => {
    const { config: _, ...withoutConfig } = makeRecord();
    expect(isSessionRecord(withoutConfig)).toBe(false);
  });

  it("returns true for a valid open config", () => {
    expect(isSessionRecord(makeRecord({ config: { type: "open" } }))).toBe(
      true
    );
  });

  it("returns false for an invalid mode value", () => {
    const invalidModeRecord = { ...makeRecord(), mode: "invalid" };
    expect(isSessionRecord(invalidModeRecord)).toBe(false);
  });
});

describe("isSessionRecordArray", () => {
  it("returns true for empty array", () => {
    expect(isSessionRecordArray([])).toBe(true);
  });

  it("returns true for array of valid records", () => {
    expect(isSessionRecordArray([makeRecord(), makeRecord()])).toBe(true);
  });

  it("returns false for non-array", () => {
    expect(isSessionRecordArray("not array")).toBe(false);
  });

  it("returns false for array with invalid elements", () => {
    expect(isSessionRecordArray([{ invalid: true }])).toBe(false);
  });
});

describe("isStatsKey", () => {
  it("returns true for valid mode:stackKey combinations", () => {
    expect(isStatsKey("flashcard:mnemonica")).toBe(true);
    expect(isStatsKey("acaan:aronson")).toBe(true);
    expect(isStatsKey("flashcard:particle")).toBe(true);
  });

  it("returns false for strings without a colon separator", () => {
    expect(isStatsKey("flashcardmnemonica")).toBe(false);
    expect(isStatsKey("invalid")).toBe(false);
  });

  it("returns false for unknown training mode", () => {
    expect(isStatsKey("unknown:mnemonica")).toBe(false);
  });

  it("returns false for unknown stack key", () => {
    expect(isStatsKey("flashcard:unknown")).toBe(false);
  });

  it("returns false for empty strings around separator", () => {
    expect(isStatsKey(":mnemonica")).toBe(false);
    expect(isStatsKey("flashcard:")).toBe(false);
    expect(isStatsKey(":")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isStatsKey("")).toBe(false);
  });

  it("returns false for keys with multiple colons", () => {
    expect(isStatsKey("flashcard:mne:monica")).toBe(false);
  });
});

describe("isAllTimeStats", () => {
  it("returns true for empty object", () => {
    expect(isAllTimeStats({})).toBe(true);
  });

  it("returns true for valid stats", () => {
    const stats: AllTimeStats = {
      "flashcard:mnemonica": createEmptyStatsEntry(),
    };
    expect(isAllTimeStats(stats)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isAllTimeStats(null)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isAllTimeStats([])).toBe(false);
  });

  it("returns false for invalid entries", () => {
    expect(isAllTimeStats({ key: "not an entry" })).toBe(false);
  });

  it("returns false for stats with invalid key format", () => {
    expect(isAllTimeStats({ "invalid-key": createEmptyStatsEntry() })).toBe(
      false
    );
  });

  it("returns false for stats with valid format but unknown mode or stack", () => {
    expect(
      isAllTimeStats({ "unknown:mnemonica": createEmptyStatsEntry() })
    ).toBe(false);
    expect(
      isAllTimeStats({ "flashcard:unknown": createEmptyStatsEntry() })
    ).toBe(false);
  });
});
