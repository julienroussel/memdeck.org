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

  it("handles different modes and stacks", () => {
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
  it("returns zeroed-out entry", () => {
    const entry = createEmptyStatsEntry();
    expect(entry).toEqual({
      totalSessions: 0,
      totalQuestions: 0,
      totalSuccesses: 0,
      totalFails: 0,
      globalBestStreak: 0,
    });
  });
});

describe("aggregateStatsEntries", () => {
  it("returns zeroed entry for empty array", () => {
    expect(aggregateStatsEntries([])).toEqual(createEmptyStatsEntry());
  });

  it("returns the entry as-is for a single-element array", () => {
    const entry: AllTimeStatsEntry = {
      totalSessions: 5,
      totalQuestions: 50,
      totalSuccesses: 40,
      totalFails: 10,
      globalBestStreak: 8,
    };
    const result = aggregateStatsEntries([entry]);
    expect(result).toEqual(entry);
  });

  it("sums multiple entries", () => {
    const entries: AllTimeStatsEntry[] = [
      {
        totalSessions: 5,
        totalQuestions: 50,
        totalSuccesses: 40,
        totalFails: 10,
        globalBestStreak: 8,
      },
      {
        totalSessions: 3,
        totalQuestions: 30,
        totalSuccesses: 20,
        totalFails: 10,
        globalBestStreak: 12,
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
