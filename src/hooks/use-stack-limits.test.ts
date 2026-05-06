import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STACK_LIMITS_LSK } from "../constants";
import {
  DEFAULT_STACK_LIMITS,
  isStackLimitsRecord,
} from "../types/stack-limits";
import { createDeckPosition, stacks } from "../types/stacks";
import { useStackLimits } from "./use-stack-limits";

// Mantine-mirroring setter: invoke `options.onSuccess` so the emit gating
// in `useStackLimits` (which depends on a successful persisted write)
// fires by default. Tests that need to simulate a write failure set
// `mockSetValueSucceeds` to `false` before calling `setLimits`.
let mockSetValueSucceeds = true;
const mockSetValue = vi.fn(
  (_next: unknown, options?: { onSuccess?: () => void }) => {
    if (mockSetValueSucceeds) {
      options?.onSuccess?.();
    }
  }
);
const mockProbeStoredValue = vi.fn();
const mockEmitStackLimitsChanged = vi.fn();

vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn((_, defaultValue) => [defaultValue, mockSetValue, vi.fn()]),
  probeStoredValue: (...args: unknown[]) => mockProbeStoredValue(...args),
}));

vi.mock("../services/analytics", () => ({
  analytics: {
    trackError: vi.fn(),
  },
}));

vi.mock("../services/event-bus", () => ({
  eventBus: {
    emit: {
      STACK_LIMITS_CHANGED: (...args: unknown[]) =>
        mockEmitStackLimitsChanged(...args),
    },
    subscribe: {},
  },
}));

const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);
const { analytics } = await import("../services/analytics");
const mockedTrackError = vi.mocked(analytics.trackError);

beforeEach(() => {
  mockProbeStoredValue.mockReturnValue({ status: "absent" });
  mockSetValueSucceeds = true;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useStackLimits", () => {
  it("returns default limits when no localStorage value exists", () => {
    const { result } = renderHook(() => useStackLimits("mnemonica"));

    expect(result.current.limits).toEqual(DEFAULT_STACK_LIMITS);
  });

  it("returns rangeSize of 52 and isFullDeck true for default limits", () => {
    const { result } = renderHook(() => useStackLimits("mnemonica"));

    expect(result.current.rangeSize).toBe(52);
    expect(result.current.isFullDeck).toBe(true);
  });

  it("returns stored limits when a value exists for the stack key", () => {
    mockedUseLocalDb.mockReturnValue([
      { mnemonica: { start: 5, end: 20 } },
      mockSetValue,
      vi.fn(),
    ]);

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    expect(result.current.limits).toEqual({
      start: createDeckPosition(5),
      end: createDeckPosition(20),
    });
  });

  it("returns isFullDeck false for a partial range", () => {
    mockedUseLocalDb.mockReturnValue([
      { mnemonica: { start: 1, end: 20 } },
      mockSetValue,
      vi.fn(),
    ]);

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    expect(result.current.isFullDeck).toBe(false);
    expect(result.current.rangeSize).toBe(20);
  });

  it("returns default limits when a different stack key is stored", () => {
    mockedUseLocalDb.mockReturnValue([
      { aronson: { start: 10, end: 30 } },
      mockSetValue,
      vi.fn(),
    ]);

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    expect(result.current.limits).toEqual(DEFAULT_STACK_LIMITS);
  });

  it("calls setRecord with the correct stack key and values when setLimits is called", () => {
    const { result } = renderHook(() => useStackLimits("mnemonica"));

    const newLimits = {
      start: createDeckPosition(10),
      end: createDeckPosition(30),
    };
    result.current.setLimits(newLimits);

    expect(mockSetValue).toHaveBeenCalledTimes(1);

    // The setter is called with a function; invoke it to verify the result
    const setterFn = mockSetValue.mock.calls[0][0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>;
    const updated = setterFn({});
    expect(updated).toEqual({ mnemonica: { start: 10, end: 30 } });
  });

  it("passes isStackLimitsRecord as the validator and write/corrupt callbacks to useLocalDb", () => {
    renderHook(() => useStackLimits("mnemonica"));

    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      STACK_LIMITS_LSK,
      expect.anything(),
      isStackLimitsRecord,
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("falls back to default limits when stored entry has start but no end", () => {
    mockedUseLocalDb.mockReturnValue([
      { mnemonica: { start: 5 } },
      mockSetValue,
      vi.fn(),
    ]);
    const { result } = renderHook(() => useStackLimits("mnemonica"));
    expect(result.current.limits).toEqual(DEFAULT_STACK_LIMITS);
  });

  it("preserves existing stack entries when setLimits is called for a different stack", () => {
    const existingRecord = { aronson: { start: 1, end: 10 } };
    mockedUseLocalDb.mockReturnValue([existingRecord, mockSetValue, vi.fn()]);

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    const newLimits = {
      start: createDeckPosition(5),
      end: createDeckPosition(25),
    };
    result.current.setLimits(newLimits);

    const setterFn = mockSetValue.mock.calls[0][0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>;
    const updated = setterFn(existingRecord);

    expect(updated).toEqual({
      aronson: { start: 1, end: 10 },
      mnemonica: { start: 5, end: 25 },
    });
  });

  it("does not write when the stored blob is corrupt — would otherwise destroy other stacks' ranges", () => {
    mockProbeStoredValue.mockReturnValue({
      status: "corrupt",
      raw: "garbage",
    });

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    result.current.setLimits({
      start: createDeckPosition(5),
      end: createDeckPosition(25),
    });

    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it("does not write when the stored blob read errored", () => {
    mockProbeStoredValue.mockReturnValue({
      status: "read-error",
      error: new Error("boom"),
    });

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    result.current.setLimits({
      start: createDeckPosition(5),
      end: createDeckPosition(25),
    });

    expect(mockSetValue).not.toHaveBeenCalled();
  });

  it("fires analytics.trackError once on mount when the stored blob is corrupt", () => {
    mockProbeStoredValue.mockReturnValue({
      status: "corrupt",
      raw: "garbage",
    });

    renderHook(() => useStackLimits("mnemonica"));

    expect(mockedTrackError).toHaveBeenCalledTimes(1);
    const [errArg] = mockedTrackError.mock.calls[0];
    expect(errArg).toBeInstanceOf(Error);
    expect((errArg as Error).message).toBe("stackLimits-corrupt");
  });

  it("does not fire trackError when the stored blob is valid or absent", () => {
    mockProbeStoredValue.mockReturnValue({ status: "absent" });

    renderHook(() => useStackLimits("mnemonica"));

    expect(mockedTrackError).not.toHaveBeenCalled();
  });

  // Parametrized over two stacks so a regression in the `stacks[stackKey].name`
  // lookup (e.g. swapping the indexer with `stackKey` itself) can't survive by
  // coincidentally matching the hardcoded literal.
  it.each([
    "mnemonica",
    "aronson",
  ] as const)("emits STACK_LIMITS_CHANGED with the correct payload when setLimits succeeds (%s)", (stackKey) => {
    const { result } = renderHook(() => useStackLimits(stackKey));

    result.current.setLimits({
      start: createDeckPosition(5),
      end: createDeckPosition(25),
    });

    expect(mockEmitStackLimitsChanged).toHaveBeenCalledTimes(1);
    expect(mockEmitStackLimitsChanged).toHaveBeenCalledWith({
      start: 5,
      end: 25,
      rangeSize: 21,
      stackName: stacks[stackKey].name,
    });
  });

  it("does not emit STACK_LIMITS_CHANGED when the corrupt-lock blocks the write", () => {
    mockProbeStoredValue.mockReturnValue({
      status: "corrupt",
      raw: "garbage",
    });

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    result.current.setLimits({
      start: createDeckPosition(5),
      end: createDeckPosition(25),
    });

    expect(mockEmitStackLimitsChanged).not.toHaveBeenCalled();
  });

  it("does not emit STACK_LIMITS_CHANGED when the stored blob read errored", () => {
    mockProbeStoredValue.mockReturnValue({
      status: "read-error",
      error: new Error("boom"),
    });

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    result.current.setLimits({
      start: createDeckPosition(5),
      end: createDeckPosition(25),
    });

    expect(mockEmitStackLimitsChanged).not.toHaveBeenCalled();
  });

  it("does not emit STACK_LIMITS_CHANGED when the wrapped setter's write fails", () => {
    // Quota exceeded / Safari private mode / ITP eviction path: Mantine
    // swallows the IO error and `useLocalDb` skips the onSuccess callback
    // it received. The analytics emit must not fire — we shouldn't pretend
    // the user's range change persisted.
    mockSetValueSucceeds = false;

    const { result } = renderHook(() => useStackLimits("mnemonica"));

    result.current.setLimits({
      start: createDeckPosition(5),
      end: createDeckPosition(25),
    });

    expect(mockSetValue).toHaveBeenCalledTimes(1);
    expect(mockEmitStackLimitsChanged).not.toHaveBeenCalled();
  });
});
