import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "../types/session";

const mockSetValue = vi.fn();
const mockRemoveValue = vi.fn();

// Mock React hooks to allow testing without React rendering context
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useMemo: vi.fn((fn) => fn()),
    useCallback: vi.fn((fn) => fn),
  };
});

vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn((_, defaultValue) => [
    defaultValue,
    mockSetValue,
    mockRemoveValue,
  ]),
}));

const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);

const { useSessionHistory } = await import("./use-session-history");

const makeRecord = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "test-id",
  mode: "flashcard",
  stackKey: "mnemonica",
  config: { type: "structured", totalQuestions: 10 },
  startedAt: "2025-01-01T00:00:00.000Z",
  endedAt: "2025-01-01T00:05:00.000Z",
  durationSeconds: 300,
  successes: 8,
  fails: 2,
  questionsCompleted: 10,
  accuracy: 0.8,
  bestStreak: 5,
  ...overrides,
});

describe("useSessionHistory", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty history when localStorage has no data", () => {
    mockedUseLocalDb.mockReturnValue([[], mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();

    expect(result.history).toEqual([]);
  });

  it("returns all records in history", () => {
    const records = [
      makeRecord({ id: "record-1" }),
      makeRecord({ id: "record-2" }),
      makeRecord({ id: "record-3" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();

    expect(result.history).toEqual(records);
    expect(result.history).toHaveLength(3);
  });

  it("returns only flashcard sessions when filtering by flashcard mode", () => {
    const records = [
      makeRecord({ id: "flashcard-1", mode: "flashcard" }),
      makeRecord({ id: "acaan-1", mode: "acaan" }),
      makeRecord({ id: "flashcard-2", mode: "flashcard" }),
      makeRecord({ id: "acaan-2", mode: "acaan" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const flashcardSessions = result.sessionsByMode("flashcard");

    expect(flashcardSessions).toHaveLength(2);
    expect(flashcardSessions[0].id).toBe("flashcard-1");
    expect(flashcardSessions[1].id).toBe("flashcard-2");
  });

  it("returns only ACAAN sessions when filtering by acaan mode", () => {
    const records = [
      makeRecord({ id: "flashcard-1", mode: "flashcard" }),
      makeRecord({ id: "acaan-1", mode: "acaan" }),
      makeRecord({ id: "flashcard-2", mode: "flashcard" }),
      makeRecord({ id: "acaan-2", mode: "acaan" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const acaanSessions = result.sessionsByMode("acaan");

    expect(acaanSessions).toHaveLength(2);
    expect(acaanSessions[0].id).toBe("acaan-1");
    expect(acaanSessions[1].id).toBe("acaan-2");
  });

  it("returns sessions filtered by stack key", () => {
    const records = [
      makeRecord({ id: "mnemonica-1", stackKey: "mnemonica" }),
      makeRecord({ id: "aronson-1", stackKey: "aronson" }),
      makeRecord({ id: "mnemonica-2", stackKey: "mnemonica" }),
      makeRecord({ id: "redford-1", stackKey: "redford" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const mnemonicaSessions = result.sessionsByStack("mnemonica");

    expect(mnemonicaSessions).toHaveLength(2);
    expect(mnemonicaSessions[0].id).toBe("mnemonica-1");
    expect(mnemonicaSessions[1].id).toBe("mnemonica-2");
  });

  it("returns sessions filtered by both mode and stack", () => {
    const records = [
      makeRecord({
        id: "flashcard-mnemonica-1",
        mode: "flashcard",
        stackKey: "mnemonica",
      }),
      makeRecord({
        id: "acaan-mnemonica-1",
        mode: "acaan",
        stackKey: "mnemonica",
      }),
      makeRecord({
        id: "flashcard-aronson-1",
        mode: "flashcard",
        stackKey: "aronson",
      }),
      makeRecord({
        id: "flashcard-mnemonica-2",
        mode: "flashcard",
        stackKey: "mnemonica",
      }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const filtered = result.sessionsByModeAndStack("flashcard", "mnemonica");

    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe("flashcard-mnemonica-1");
    expect(filtered[1].id).toBe("flashcard-mnemonica-2");
  });

  it("returns empty array when no sessions match the mode filter", () => {
    const records = [
      makeRecord({ id: "flashcard-1", mode: "flashcard" }),
      makeRecord({ id: "flashcard-2", mode: "flashcard" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const acaanSessions = result.sessionsByMode("acaan");

    expect(acaanSessions).toEqual([]);
  });

  it("returns empty array when no sessions match the stack filter", () => {
    const records = [
      makeRecord({ id: "record-1", stackKey: "mnemonica" }),
      makeRecord({ id: "record-2", stackKey: "mnemonica" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const aronsonSessions = result.sessionsByStack("aronson");

    expect(aronsonSessions).toEqual([]);
  });

  it("returns empty array when no sessions match both mode and stack filters", () => {
    const records = [
      makeRecord({
        id: "flashcard-mnemonica",
        mode: "flashcard",
        stackKey: "mnemonica",
      }),
      makeRecord({ id: "acaan-aronson", mode: "acaan", stackKey: "aronson" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const filtered = result.sessionsByModeAndStack("acaan", "mnemonica");

    expect(filtered).toEqual([]);
  });

  it("returns empty history when localStorage contains invalid data", () => {
    const invalidData = { not: "an array" };
    mockedUseLocalDb.mockReturnValue([
      invalidData,
      mockSetValue,
      mockRemoveValue,
    ]);

    const result = useSessionHistory();

    expect(result.history).toEqual([]);
  });

  it("returns empty history when localStorage contains array with invalid records", () => {
    const invalidRecords = [
      { id: "test", invalid: true },
      makeRecord({ id: "valid-record" }),
    ];
    mockedUseLocalDb.mockReturnValue([
      invalidRecords,
      mockSetValue,
      mockRemoveValue,
    ]);

    const result = useSessionHistory();

    expect(result.history).toEqual([]);
  });

  it("returns all matching sessions when multiple stacks are used", () => {
    const records = [
      makeRecord({ id: "mnemonica-1", stackKey: "mnemonica" }),
      makeRecord({ id: "aronson-1", stackKey: "aronson" }),
      makeRecord({ id: "memorandum-1", stackKey: "memorandum" }),
      makeRecord({ id: "aronson-2", stackKey: "aronson" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const aronsonSessions = result.sessionsByStack("aronson");

    expect(aronsonSessions).toHaveLength(2);
    expect(aronsonSessions.every((s) => s.stackKey === "aronson")).toBe(true);
  });

  it("preserves record order in filtered results", () => {
    const records = [
      makeRecord({ id: "record-1", mode: "flashcard", stackKey: "mnemonica" }),
      makeRecord({ id: "record-2", mode: "acaan", stackKey: "mnemonica" }),
      makeRecord({ id: "record-3", mode: "flashcard", stackKey: "mnemonica" }),
      makeRecord({ id: "record-4", mode: "flashcard", stackKey: "aronson" }),
      makeRecord({ id: "record-5", mode: "flashcard", stackKey: "mnemonica" }),
    ];
    mockedUseLocalDb.mockReturnValue([records, mockSetValue, mockRemoveValue]);

    const result = useSessionHistory();
    const filtered = result.sessionsByModeAndStack("flashcard", "mnemonica");

    expect(filtered.map((r) => r.id)).toEqual([
      "record-1",
      "record-3",
      "record-5",
    ]);
  });
});
