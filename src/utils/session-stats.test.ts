import { describe, expect, it } from "vitest";
import type { AllTimeStatsEntry } from "../types/session";
import {
  aggregateStatsEntries,
  createEmptyStatsEntry,
  parseStatsKey,
  statsKey,
} from "./session-stats";

describe("statsKey", () => {
  it("builds a composite key from mode and stackKey", () => {
    expect(statsKey("flashcard", "mnemonica")).toBe("flashcard:mnemonica");
  });

  it("builds a composite key for any mode and stack combination", () => {
    expect(statsKey("acaan", "aronson")).toBe("acaan:aronson");
  });
});

describe("parseStatsKey", () => {
  it("extracts mode and stackKey from a valid StatsKey", () => {
    const result = parseStatsKey("flashcard:mnemonica");
    expect(result).toEqual({ mode: "flashcard", stackKey: "mnemonica" });
  });

  it("extracts mode and stackKey for acaan mode", () => {
    const result = parseStatsKey("acaan:aronson");
    expect(result).toEqual({ mode: "acaan", stackKey: "aronson" });
  });
});

describe("createEmptyStatsEntry", () => {
  it("returns an entry with all numeric fields set to zero", () => {
    const entry = createEmptyStatsEntry();
    expect(entry).toEqual({
      globalBestStreak: 0,
      totalFails: 0,
      totalQuestions: 0,
      totalSessions: 0,
      totalSuccesses: 0,
    });
  });
});

describe("aggregateStatsEntries", () => {
  it("returns zeroed entry for empty array", () => {
    expect(aggregateStatsEntries([])).toEqual(createEmptyStatsEntry());
  });

  it("returns the entry as-is for a single-element array", () => {
    const entry: AllTimeStatsEntry = {
      globalBestStreak: 8,
      totalFails: 10,
      totalQuestions: 50,
      totalSessions: 5,
      totalSuccesses: 40,
    };
    const result = aggregateStatsEntries([entry]);
    expect(result).toEqual(entry);
  });

  it("sums totals across entries and takes the max globalBestStreak", () => {
    const entries: AllTimeStatsEntry[] = [
      {
        globalBestStreak: 8,
        totalFails: 10,
        totalQuestions: 50,
        totalSessions: 5,
        totalSuccesses: 40,
      },
      {
        globalBestStreak: 12,
        totalFails: 10,
        totalQuestions: 30,
        totalSessions: 3,
        totalSuccesses: 20,
      },
    ];

    const result = aggregateStatsEntries(entries);

    expect(result.totalSessions).toBe(8);
    expect(result.totalQuestions).toBe(80);
    expect(result.totalSuccesses).toBe(60);
    expect(result.totalFails).toBe(20);
    expect(result.globalBestStreak).toBe(12);
  });
});
