import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOCUS_POSITIONS_LSK } from "../../constants";
import { createGatedSetterMock } from "../../test-utils/mock-local-db-setter";
import type { StackLimits } from "../../types/stack-limits";
import type { DeckPosition } from "../../types/stacks";
import { createDeckPosition } from "../../types/stacks";
import { isFocusPositionList } from "../../utils/focus-positions";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../../utils/localstorage-telemetry";
import { useFlashcardPool } from "./use-flashcard-pool";

const range: StackLimits = {
  end: createDeckPosition(13),
  start: createDeckPosition(1),
};
const focusList = [23, 24, 28, 29, 30, 31, 42].map(createDeckPosition);

let storedPositions: readonly DeckPosition[] = [];
let setterSucceeds = true;
const mockSetPositions = createGatedSetterMock<readonly DeckPosition[]>(
  () => setterSucceeds
);
const mockTrackEvent = vi.fn();

vi.mock("../../hooks/use-stack-limits", () => ({
  useStackLimits: () => ({
    isFullDeck: false,
    limits: range,
    rangeSize: 13,
    setLimits: vi.fn(),
  }),
}));

vi.mock("../../utils/localstorage", () => ({
  useLocalDb: vi.fn(() => [storedPositions, mockSetPositions, vi.fn()]),
}));

vi.mock("../../services/analytics", () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

const { useLocalDb } = await import("../../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);

beforeEach(() => {
  storedPositions = [];
  setterSucceeds = true;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useFlashcardPool", () => {
  it("reads the list from one key per stack, with telemetry wired in", () => {
    renderHook(() => useFlashcardPool("aronson"));

    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      `${FOCUS_POSITIONS_LSK}-aronson`,
      [],
      isFocusPositionList,
      {
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      }
    );
  });

  it("uses the stack range while no list is set", () => {
    const { result } = renderHook(() => useFlashcardPool("mnemonica"));

    expect(result.current.pool).toEqual({ kind: "range", limits: range });
    expect(result.current.poolSize).toBe(13);
    expect(result.current.sessionScope).toEqual({ stackLimits: range });
  });

  it("replaces the stack range with the list while one is set", () => {
    storedPositions = focusList;
    const { result } = renderHook(() => useFlashcardPool("mnemonica"));

    expect(result.current.pool).toEqual({
      kind: "focus",
      positions: focusList,
    });
    expect(result.current.poolSize).toBe(7);
    expect(result.current.sessionScope).toEqual({
      focusPositions: focusList,
    });
  });

  it("tracks a saved list only once it is written", () => {
    const { result } = renderHook(() => useFlashcardPool("mnemonica"));

    act(() => {
      result.current.setFocusPositions(focusList);
    });

    expect(mockSetPositions).toHaveBeenCalledWith(focusList, {
      onSuccess: expect.any(Function),
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "Settings",
      "Focus Positions Set",
      "Tamariz (7)"
    );
  });

  it("tracks a cleared list", () => {
    const { result } = renderHook(() => useFlashcardPool("mnemonica"));

    act(() => {
      result.current.setFocusPositions([]);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "Settings",
      "Focus Positions Cleared",
      "Tamariz (0)"
    );
  });

  it("does not track a list the write failed to save", () => {
    setterSucceeds = false;
    const { result } = renderHook(() => useFlashcardPool("mnemonica"));

    act(() => {
      result.current.setFocusPositions(focusList);
    });

    expect(mockSetPositions).toHaveBeenCalledOnce();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
