import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AllTimeStats, AllTimeStatsEntry } from "../types/session";

const makeEntry = (
  overrides: Partial<AllTimeStatsEntry> = {}
): AllTimeStatsEntry => ({
  globalBestStreak: 0,
  totalFails: 0,
  totalQuestions: 0,
  totalSessions: 0,
  totalSuccesses: 0,
  ...overrides,
});

// Mock the useLocalDb hook to control returned data. We let real React drive
// `useState`, `useMemo`, and `useCallback` via `renderHook`, so only
// collaborator mocks remain — the corruption transition itself is covered
// by `use-all-time-stats-corruption.test.ts`.
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

      const { result } = renderHook(() => useAllTimeStats());

      expect(result.current.stats).toEqual({});
    });

    it("getStats returns empty entry for any mode and stack", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStats("flashcard", "mnemonica");

      expect(entry).toEqual(makeEntry());
    });

    it("getStatsByMode returns empty entry", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByMode("flashcard");

      expect(entry).toEqual(makeEntry());
    });

    it("getStatsByStack returns empty entry", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByStack("mnemonica");

      expect(entry).toEqual(makeEntry());
    });

    it("getGlobalStats returns empty entry", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getGlobalStats();

      expect(entry).toEqual(makeEntry());
    });
  });

  describe("getStats", () => {
    it("returns the correct entry for a specific mode and stack combination", () => {
      const stats: AllTimeStats = {
        "acaan:mnemonica": makeEntry({
          globalBestStreak: 6,
          totalFails: 5,
          totalQuestions: 30,
          totalSessions: 3,
          totalSuccesses: 25,
        }),
        "flashcard:aronson": makeEntry({
          globalBestStreak: 8,
          totalFails: 10,
          totalQuestions: 50,
          totalSessions: 5,
          totalSuccesses: 40,
        }),
        "flashcard:mnemonica": makeEntry({
          globalBestStreak: 15,
          totalFails: 20,
          totalQuestions: 100,
          totalSessions: 10,
          totalSuccesses: 80,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStats("flashcard", "mnemonica");

      expect(entry).toEqual(stats["flashcard:mnemonica"]);
    });

    it("returns empty entry for an unknown mode and stack combination", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({ totalSessions: 5 }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStats("acaan", "aronson");

      expect(entry).toEqual(makeEntry());
    });
  });

  describe("getStatsByMode", () => {
    it("aggregates all stacks for a given mode", () => {
      const stats: AllTimeStats = {
        "acaan:mnemonica": makeEntry({
          globalBestStreak: 6,
          totalFails: 5,
          totalQuestions: 30,
          totalSessions: 3,
          totalSuccesses: 25,
        }),
        "flashcard:aronson": makeEntry({
          globalBestStreak: 8,
          totalFails: 10,
          totalQuestions: 50,
          totalSessions: 5,
          totalSuccesses: 40,
        }),
        "flashcard:mnemonica": makeEntry({
          globalBestStreak: 15,
          totalFails: 20,
          totalQuestions: 100,
          totalSessions: 10,
          totalSuccesses: 80,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByMode("flashcard");

      expect(entry).toEqual({
        globalBestStreak: 15,
        totalFails: 30,
        totalQuestions: 150,
        totalSessions: 15,
        totalSuccesses: 120,
      });
    });

    it("returns empty entry when no stats exist for the mode", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({ totalSessions: 10 }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByMode("acaan");

      expect(entry).toEqual(makeEntry());
    });

    it("aggregates multiple stacks with best streak as max", () => {
      const stats: AllTimeStats = {
        "flashcard:aronson": makeEntry({
          globalBestStreak: 15,
          totalSessions: 3,
        }),
        "flashcard:memorandum": makeEntry({
          globalBestStreak: 25,
          totalSessions: 2,
        }),
        "flashcard:mnemonica": makeEntry({
          globalBestStreak: 20,
          totalSessions: 5,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByMode("flashcard");

      expect(entry.globalBestStreak).toBe(25);
      expect(entry.totalSessions).toBe(10);
    });
  });

  describe("getStatsByStack", () => {
    it("aggregates all modes for a given stack", () => {
      const stats: AllTimeStats = {
        "acaan:mnemonica": makeEntry({
          globalBestStreak: 8,
          totalFails: 10,
          totalQuestions: 50,
          totalSessions: 5,
          totalSuccesses: 40,
        }),
        "flashcard:aronson": makeEntry({
          globalBestStreak: 6,
          totalFails: 5,
          totalQuestions: 30,
          totalSessions: 3,
          totalSuccesses: 25,
        }),
        "flashcard:mnemonica": makeEntry({
          globalBestStreak: 15,
          totalFails: 20,
          totalQuestions: 100,
          totalSessions: 10,
          totalSuccesses: 80,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByStack("mnemonica");

      expect(entry).toEqual({
        globalBestStreak: 15,
        totalFails: 30,
        totalQuestions: 150,
        totalSessions: 15,
        totalSuccesses: 120,
      });
    });

    it("returns empty entry when no stats exist for the stack", () => {
      const stats: AllTimeStats = {
        "flashcard:mnemonica": makeEntry({ totalSessions: 10 }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByStack("aronson");

      expect(entry).toEqual(makeEntry());
    });

    it("aggregates multiple modes with best streak as max", () => {
      const stats: AllTimeStats = {
        "acaan:mnemonica": makeEntry({
          globalBestStreak: 18,
          totalSessions: 4,
        }),
        "flashcard:mnemonica": makeEntry({
          globalBestStreak: 12,
          totalSessions: 8,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStatsByStack("mnemonica");

      expect(entry.globalBestStreak).toBe(18);
      expect(entry.totalSessions).toBe(12);
    });
  });

  describe("getGlobalStats", () => {
    it("aggregates all entries across all modes and stacks", () => {
      const stats: AllTimeStats = {
        "acaan:aronson": makeEntry({
          globalBestStreak: 6,
          totalFails: 5,
          totalQuestions: 20,
          totalSessions: 2,
          totalSuccesses: 15,
        }),
        "acaan:mnemonica": makeEntry({
          globalBestStreak: 8,
          totalFails: 5,
          totalQuestions: 30,
          totalSessions: 3,
          totalSuccesses: 25,
        }),
        "flashcard:aronson": makeEntry({
          globalBestStreak: 12,
          totalFails: 10,
          totalQuestions: 50,
          totalSessions: 5,
          totalSuccesses: 40,
        }),
        "flashcard:mnemonica": makeEntry({
          globalBestStreak: 15,
          totalFails: 20,
          totalQuestions: 100,
          totalSessions: 10,
          totalSuccesses: 80,
        }),
      };

      mockedUseLocalDb.mockReturnValue([stats, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getGlobalStats();

      expect(entry).toEqual({
        globalBestStreak: 15,
        totalFails: 40,
        totalQuestions: 200,
        totalSessions: 20,
        totalSuccesses: 160,
      });
    });

    it("returns empty entry when no stats exist", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getGlobalStats();

      expect(entry).toEqual(makeEntry());
    });
  });

  describe("invalid data handling", () => {
    it("getStats returns empty entry for missing key", () => {
      mockedUseLocalDb.mockReturnValue([{}, vi.fn(), vi.fn()]);

      const { result } = renderHook(() => useAllTimeStats());

      const entry = result.current.getStats("flashcard", "mnemonica");

      expect(entry).toEqual(makeEntry());
    });
  });
});
