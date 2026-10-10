import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SELECTED_STACK_LSK } from "../constants";
import { stacks } from "../types/stacks";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";
import {
  isStackKey,
  useRequiredStack,
  useSelectedStack,
} from "./use-selected-stack";

const mockSetValue = vi.fn();

vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn((_, defaultValue) => [defaultValue, mockSetValue, vi.fn()]),
}));

// Only `reportLocalDbCorruption` is replaced so the real `useLocalDb` (used
// by the stored-value test below) keeps its other telemetry imports.
vi.mock("../utils/localstorage-telemetry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/localstorage-telemetry")>()),
  reportLocalDbCorruption: vi.fn(),
}));

const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);
const actualLocalStorage = await vi.importActual<
  typeof import("../utils/localstorage")
>("../utils/localstorage");

// `vi.clearAllMocks` keeps implementations, so a `mockReturnValue` from one
// test would leak into the next; `mockReset` restores the pass-through.
beforeEach(() => {
  mockedUseLocalDb.mockReset();
});

describe("isStackKey", () => {
  it("returns true for valid stack keys", () => {
    expect(isStackKey("mnemonica")).toBe(true);
    expect(isStackKey("aronson")).toBe(true);
    expect(isStackKey("memorandum")).toBe(true);
    expect(isStackKey("redford")).toBe(true);
    expect(isStackKey("particle")).toBe(true);
    expect(isStackKey("elephant")).toBe(true);
  });

  it("returns false for invalid stack keys", () => {
    expect(isStackKey("")).toBe(false);
    expect(isStackKey("invalid")).toBe(false);
    expect(isStackKey("MNEMONICA")).toBe(false);
    expect(isStackKey("random-key")).toBe(false);
    expect(isStackKey("123")).toBe(false);
  });

  it("returns false for non-string-like values coerced to string", () => {
    expect(isStackKey("null")).toBe(false);
    expect(isStackKey("undefined")).toBe(false);
    expect(isStackKey("object")).toBe(false);
  });

  it("returns false for names inherited from Object.prototype", () => {
    expect(isStackKey("constructor")).toBe(false);
    expect(isStackKey("toString")).toBe(false);
    expect(isStackKey("__proto__")).toBe(false);
    expect(isStackKey("hasOwnProperty")).toBe(false);
    expect(isStackKey("valueOf")).toBe(false);
  });
});

describe("useSelectedStack", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty state when no stack is selected", () => {
    mockedUseLocalDb.mockReturnValue(["", mockSetValue, vi.fn()]);

    const result = useSelectedStack();

    expect(result.stackKey).toBe("");
    expect(result.stack).toBeNull();
    expect(result.stackOrder).toBeNull();
    expect(result.stackName).toBeNull();
    expect(result.setStackKey).toBeDefined();
  });

  it("returns stack data when a valid stack is selected", () => {
    mockedUseLocalDb.mockReturnValue(["mnemonica", mockSetValue, vi.fn()]);

    const result = useSelectedStack();

    expect(result.stackKey).toBe("mnemonica");
    expect(result.stack).toBe(stacks.mnemonica);
    expect(result.stackOrder).toBe(stacks.mnemonica.order);
    expect(result.stackName).toBe(stacks.mnemonica.name);
  });

  it("returns empty state when an invalid stack key is stored", () => {
    mockedUseLocalDb.mockReturnValue(["invalid-key", mockSetValue, vi.fn()]);

    const result = useSelectedStack();

    expect(result.stackKey).toBe("");
    expect(result.stack).toBeNull();
  });

  it("setStackKey updates to valid stack key", () => {
    mockedUseLocalDb.mockReturnValue(["", mockSetValue, vi.fn()]);

    const result = useSelectedStack();
    result.setStackKey("aronson");

    expect(mockSetValue).toHaveBeenCalledWith("aronson");
  });

  it("setStackKey passes empty string through to storage", () => {
    mockedUseLocalDb.mockReturnValue(["mnemonica", mockSetValue, vi.fn()]);

    const result = useSelectedStack();
    result.setStackKey("");

    expect(mockSetValue).toHaveBeenCalledWith("");
  });

  it("calls useLocalDb with the selected-stack LSK, validator, and corruption/write-failure callbacks", () => {
    mockedUseLocalDb.mockReturnValue(["", mockSetValue, vi.fn()]);

    useSelectedStack();

    expect(mockedUseLocalDb).toHaveBeenCalledWith(
      SELECTED_STACK_LSK,
      "",
      expect.any(Function),
      expect.objectContaining({
        onCorrupt: reportLocalDbCorruption,
        onWriteFailed: handleLocalDbWriteFailed,
      })
    );
  });

  it("passes a validator that rejects names inherited from Object.prototype", () => {
    useSelectedStack();

    const validate = mockedUseLocalDb.mock.calls[0]?.[2];
    if (!validate) {
      throw new Error("Expected useLocalDb to receive a validator");
    }
    expect(validate("constructor")).toBe(false);
    expect(validate("toString")).toBe(false);
    expect(validate("__proto__")).toBe(false);
    expect(validate("")).toBe(true);
    expect(validate("mnemonica")).toBe(true);
  });

  it("reports corruption and returns empty state when the stored key is an Object.prototype name", () => {
    mockedUseLocalDb.mockImplementation(actualLocalStorage.useLocalDb);
    localStorage.setItem(SELECTED_STACK_LSK, JSON.stringify("constructor"));

    try {
      const { result } = renderHook(() => useSelectedStack());

      expect(reportLocalDbCorruption).toHaveBeenCalledWith(
        SELECTED_STACK_LSK,
        "constructor"
      );
      expect(result.current.stackKey).toBe("");
      expect(result.current.stack).toBeNull();
    } finally {
      localStorage.removeItem(SELECTED_STACK_LSK);
    }
  });

  it("setStackKey handles empty string input", () => {
    mockedUseLocalDb.mockReturnValue(["mnemonica", mockSetValue, vi.fn()]);

    const result = useSelectedStack();
    result.setStackKey("");

    expect(mockSetValue).toHaveBeenCalledWith("");
  });

  it.each(Object.entries(stacks))(
    "works with stack: %s",
    (key, expectedStack) => {
      mockedUseLocalDb.mockReturnValue([key, mockSetValue, vi.fn()]);

      const result = useSelectedStack();

      expect(result.stackKey).toBe(key);
      expect(result.stack).toBe(expectedStack);
    }
  );
});

describe("useRequiredStack", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns stack data when a valid stack is selected", () => {
    mockedUseLocalDb.mockReturnValue(["mnemonica", mockSetValue, vi.fn()]);

    const result = useRequiredStack();

    expect(result.stackKey).toBe("mnemonica");
    expect(result.stack).toBe(stacks.mnemonica);
    expect(result.stackOrder).toBe(stacks.mnemonica.order);
    expect(result.stackName).toBe(stacks.mnemonica.name);
  });

  it("throws error when no stack is selected", () => {
    mockedUseLocalDb.mockReturnValue(["", mockSetValue, vi.fn()]);

    expect(() => useRequiredStack()).toThrow(
      "useRequiredStack must be used within a RequireStack-protected route"
    );
  });

  it("throws error when invalid stack key is stored", () => {
    mockedUseLocalDb.mockReturnValue(["invalid", mockSetValue, vi.fn()]);

    expect(() => useRequiredStack()).toThrow(
      "useRequiredStack must be used within a RequireStack-protected route"
    );
  });

  it.each(Object.entries(stacks))(
    "works with stack: %s",
    (key, expectedStack) => {
      mockedUseLocalDb.mockReturnValue([key, mockSetValue, vi.fn()]);

      const result = useRequiredStack();

      expect(result.stackKey).toBe(key);
      expect(result.stack).toBe(expectedStack);
      expect(result.stackOrder).toHaveLength(52);
    }
  );
});
