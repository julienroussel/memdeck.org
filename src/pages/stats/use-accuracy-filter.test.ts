import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeSessionRecord } from "../../test-utils/session-factories";
import type { SessionRecord } from "../../types/session";
import {
  isFilter,
  isFlashcardSubFilter,
  useAccuracyFilter,
} from "./use-accuracy-filter";

describe("isFilter", () => {
  it("returns true for 'all'", () => {
    expect(isFilter("all")).toBe(true);
  });

  it("returns true for all training modes", () => {
    expect(isFilter("flashcard")).toBe(true);
    expect(isFilter("acaan")).toBe(true);
    expect(isFilter("spotcheck")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isFilter("invalid")).toBe(false);
    expect(isFilter("")).toBe(false);
    expect(isFilter("FLASHCARD")).toBe(false);
  });
});

describe("isFlashcardSubFilter", () => {
  it("returns true for valid sub-filter values", () => {
    expect(isFlashcardSubFilter("all")).toBe(true);
    expect(isFlashcardSubFilter("position")).toBe(true);
    expect(isFlashcardSubFilter("neighbor")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isFlashcardSubFilter("invalid")).toBe(false);
    expect(isFlashcardSubFilter("")).toBe(false);
  });
});

describe("useAccuracyFilter", () => {
  const flashcardNeighbor = makeSessionRecord({
    id: "fc-neighbor",
    mode: "flashcard",
    flashcardMode: "neighbor",
  });

  const flashcardPosition = makeSessionRecord({
    id: "fc-position",
    mode: "flashcard",
    flashcardMode: "cardonly",
  });

  const acaanSession = makeSessionRecord({
    id: "acaan-1",
    mode: "acaan",
  });

  const spotCheckMissing = makeSessionRecord({
    id: "sc-missing",
    mode: "spotcheck",
    spotCheckMode: "missing",
  });

  const spotCheckSwapped = makeSessionRecord({
    id: "sc-swapped",
    mode: "spotcheck",
    spotCheckMode: "swapped",
  });

  const allSessions: SessionRecord[] = [
    flashcardNeighbor,
    flashcardPosition,
    acaanSession,
    spotCheckMissing,
    spotCheckSwapped,
  ];

  it("returns all sessions when filter is 'all'", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));
    expect(result.current.filteredHistory).toHaveLength(5);
  });

  it("filters by flashcard mode", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("flashcard");
    });

    expect(result.current.filteredHistory).toHaveLength(2);
    for (const r of result.current.filteredHistory) {
      expect(r.mode).toBe("flashcard");
    }
  });

  it("filters by spotcheck mode", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("spotcheck");
    });

    expect(result.current.filteredHistory).toHaveLength(2);
    for (const r of result.current.filteredHistory) {
      expect(r.mode).toBe("spotcheck");
    }
  });

  it("filters by spotcheck sub-mode", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("spotcheck");
    });
    act(() => {
      result.current.handleSpotCheckSubFilterChange("missing");
    });

    expect(result.current.filteredHistory).toHaveLength(1);
    expect(result.current.filteredHistory[0]?.id).toBe("sc-missing");
  });

  it("filters by flashcard sub-mode 'neighbor'", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("flashcard");
    });
    act(() => {
      result.current.handleFlashcardSubFilterChange("neighbor");
    });

    expect(result.current.filteredHistory).toHaveLength(1);
    expect(result.current.filteredHistory[0]?.id).toBe("fc-neighbor");
  });

  it("resets flashcard sub-filter when switching away from flashcard", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("flashcard");
    });
    act(() => {
      result.current.handleFlashcardSubFilterChange("neighbor");
    });
    act(() => {
      result.current.handleFilterChange("all");
    });

    expect(result.current.flashcardSubFilter).toBe("all");
  });

  it("resets spotcheck sub-filter when switching away from spotcheck", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("spotcheck");
    });
    act(() => {
      result.current.handleSpotCheckSubFilterChange("swapped");
    });
    act(() => {
      result.current.handleFilterChange("all");
    });

    expect(result.current.spotCheckSubFilter).toBe("all");
  });

  it("ignores invalid filter values", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("invalid");
    });

    expect(result.current.filter).toBe("all");
  });

  it("ignores invalid spotcheck sub-filter values", () => {
    const { result } = renderHook(() => useAccuracyFilter(allSessions));

    act(() => {
      result.current.handleFilterChange("spotcheck");
    });
    act(() => {
      result.current.handleSpotCheckSubFilterChange("invalid");
    });

    expect(result.current.spotCheckSubFilter).toBe("all");
  });
});
