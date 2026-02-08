import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AllTimeStats, AllTimeStatsEntry } from "../types/session";

const makeEntry = (
  overrides: Partial<AllTimeStatsEntry> = {}
): AllTimeStatsEntry => ({
  totalSessions: 0,
  totalQuestions: 0,
  totalSuccesses: 0,
  totalFails: 0,
  globalBestStreak: 0,
  ...overrides,
});

// Mock React hooks to return the callback/memo value directly
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useMemo: (fn: () => unknown) => fn(),
    useCallback: (fn: unknown) => fn,
  };
});

// Mock the useLocalDb hook to control returned data
vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn(),
}));

const { useLocalDb } = await import("../utils/localstorage");
const { useAllTimeStats } = await import("./use-all-time-stats");

const mockedUseLocalDb = vi.mocked(useLocalDb);

describe("useAllTimeStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock returns empty stats
    mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);
  });

  describe("when no data exists", () => {
    it("returns empty stats object", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      expect(result.stats).toEqual({});
    });

    it("getStats returns empty entry for any mode and stack", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStats("flashcard", "mnemonica");

      expect(entry).toEqual(makeEntry());
    });

    it("getStatsByMode returns empty entry", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByMode("flashcard");

      expect(entry).toEqual(makeEntry());
    });

    it("getStatsByStack returns empty entry", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByStack("mnemonica");

      expect(entry).toEqual(makeEntry());
    });

    it("getGlobalStats returns empty entry", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getGlobalStats();

      expect(entry).toEqual(makeEntry());
    });
  });

  describe("getStats", () => {
    it("returns the correct entry for a specific mode and stack combination", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({
          totalSessions: 10,
          totalQuestions: 100,
          totalSuccesses: 80,
          totalFails: 20,
          globalBestStreak: 15,
        }),
        "flashcard:aronson": makeEntry({
          totalSessions: 5,
          totalQuestions: 50,
          totalSuccesses: 40,
          totalFails: 10,
          globalBestStreak: 8,
        }),
        "acaan:mnemonica": makeEntry({
          totalSessions: 3,
          totalQuestions: 30,
          totalSuccesses: 25,
          totalFails: 5,
          globalBestStreak: 6,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStats("flashcard", "mnemonica");

      expect(entry).toEqual(stats["flashcard:mnemonica"]);
    });

    it("returns empty entry for an unknown mode and stack combination", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({ totalSessions: 5 }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStats("acaan", "aronson");

      expect(entry).toEqual(makeEntry());
    });
  });

  describe("getStatsByMode", () => {
    it("aggregates all stacks for a given mode", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({
          totalSessions: 10,
          totalQuestions: 100,
          totalSuccesses: 80,
          totalFails: 20,
          globalBestStreak: 15,
        }),
        "flashcard:aronson": makeEntry({
          totalSessions: 5,
          totalQuestions: 50,
          totalSuccesses: 40,
          totalFails: 10,
          globalBestStreak: 8,
        }),
        "acaan:mnemonica": makeEntry({
          totalSessions: 3,
          totalQuestions: 30,
          totalSuccesses: 25,
          totalFails: 5,
          globalBestStreak: 6,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByMode("flashcard");

      expect(entry).toEqual({
        totalSessions: 15,
        totalQuestions: 150,
        totalSuccesses: 120,
        totalFails: 30,
        globalBestStreak: 15,
      });
    });

    it("returns empty entry when no stats exist for the mode", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({ totalSessions: 10 }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByMode("acaan");

      expect(entry).toEqual(makeEntry());
    });

    it("aggregates multiple stacks with best streak as max", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({
          totalSessions: 5,
          globalBestStreak: 20,
        }),
        "flashcard:aronson": makeEntry({
          totalSessions: 3,
          globalBestStreak: 15,
        }),
        "flashcard:memorandum": makeEntry({
          totalSessions: 2,
          globalBestStreak: 25,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByMode("flashcard");

      expect(entry.globalBestStreak).toBe(25);
      expect(entry.totalSessions).toBe(10);
    });
  });

  describe("getStatsByStack", () => {
    it("aggregates all modes for a given stack", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({
          totalSessions: 10,
          totalQuestions: 100,
          totalSuccesses: 80,
          totalFails: 20,
          globalBestStreak: 15,
        }),
        "acaan:mnemonica": makeEntry({
          totalSessions: 5,
          totalQuestions: 50,
          totalSuccesses: 40,
          totalFails: 10,
          globalBestStreak: 8,
        }),
        "flashcard:aronson": makeEntry({
          totalSessions: 3,
          totalQuestions: 30,
          totalSuccesses: 25,
          totalFails: 5,
          globalBestStreak: 6,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByStack("mnemonica");

      expect(entry).toEqual({
        totalSessions: 15,
        totalQuestions: 150,
        totalSuccesses: 120,
        totalFails: 30,
        globalBestStreak: 15,
      });
    });

    it("returns empty entry when no stats exist for the stack", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({ totalSessions: 10 }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByStack("aronson");

      expect(entry).toEqual(makeEntry());
    });

    it("aggregates multiple modes with best streak as max", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({
          totalSessions: 8,
          globalBestStreak: 12,
        }),
        "acaan:mnemonica": makeEntry({
          totalSessions: 4,
          globalBestStreak: 18,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStatsByStack("mnemonica");

      expect(entry.globalBestStreak).toBe(18);
      expect(entry.totalSessions).toBe(12);
    });
  });

  describe("getGlobalStats", () => {
    it("aggregates all entries across all modes and stacks", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({
          totalSessions: 10,
          totalQuestions: 100,
          totalSuccesses: 80,
          totalFails: 20,
          globalBestStreak: 15,
        }),
        "flashcard:aronson": makeEntry({
          totalSessions: 5,
          totalQuestions: 50,
          totalSuccesses: 40,
          totalFails: 10,
          globalBestStreak: 12,
        }),
        "acaan:mnemonica": makeEntry({
          totalSessions: 3,
          totalQuestions: 30,
          totalSuccesses: 25,
          totalFails: 5,
          globalBestStreak: 8,
        }),
        "acaan:aronson": makeEntry({
          totalSessions: 2,
          totalQuestions: 20,
          totalSuccesses: 15,
          totalFails: 5,
          globalBestStreak: 6,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getGlobalStats();

      expect(entry).toEqual({
        totalSessions: 20,
        totalQuestions: 200,
        totalSuccesses: 160,
        totalFails: 40,
        globalBestStreak: 15,
      });
    });

    it("returns empty entry when no stats exist", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getGlobalStats();

      expect(entry).toEqual(makeEntry());
    });
  });

  describe("invalid data handling", () => {
    it("returns empty stats when validation fails", () => {
      // Invalid data structure (array instead of object)
      const invalidStats: unknown = [];

      mockedUseLocalDb.mockReturnValue([invalidStats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      expect(result.stats).toEqual({});
    });

    it("returns empty stats when entries have invalid types", () => {
      // Invalid entry structure
      const invalidStats: unknown = {
        "flashcard:mnemonica": {
          totalSessions: "not a number",
          totalQuestions: 10,
        },
      };

      mockedUseLocalDb.mockReturnValue([invalidStats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      expect(result.stats).toEqual({});
    });

    it("getStats returns empty entry when stats are invalid", () => {
      const invalidStats = { invalid: "data" };

      mockedUseLocalDb.mockReturnValue([invalidStats, vi.fn(), vi.fn()]);

      const result = useAllTimeStats();

      const entry = result.getStats("flashcard", "mnemonica");

      expect(entry).toEqual(makeEntry());
    });
  });
});
