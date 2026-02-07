import { afterEach, describe, expect, it, vi } from "vitest";
import { stacks } from "../types/stacks";
import {
  isStackKey,
  useRequiredStack,
  useSelectedStack,
} from "./use-selected-stack";

const mockSetValue = vi.fn();

vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn((_, defaultValue) => [defaultValue, mockSetValue, vi.fn()]),
}));

const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);

describe("isStackKey", () => {
  it("returns true for valid stack keys", () => {
    expect(isStackKey("mnemonica")).toBe(true);
    expect(isStackKey("aronson")).toBe(true);
    expect(isStackKey("memorandum")).toBe(true);
    expect(isStackKey("redford")).toBe(true);
    expect(isStackKey("particle")).toBe(true);
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

  it("setStackKey resets to empty string for invalid key", () => {
    mockedUseLocalDb.mockReturnValue(["mnemonica", mockSetValue, vi.fn()]);

    const result = useSelectedStack();
    result.setStackKey("not-a-real-stack");

    expect(mockSetValue).toHaveBeenCalledWith("");
  });

  it("setStackKey handles empty string input", () => {
    mockedUseLocalDb.mockReturnValue(["mnemonica", mockSetValue, vi.fn()]);

    const result = useSelectedStack();
    result.setStackKey("");

    expect(mockSetValue).toHaveBeenCalledWith("");
  });

  it.each(
    Object.entries(stacks)
  )("works with stack: %s", (key, expectedStack) => {
    mockedUseLocalDb.mockReturnValue([key, mockSetValue, vi.fn()]);

    const result = useSelectedStack();

    expect(result.stackKey).toBe(key);
    expect(result.stack).toBe(expectedStack);
  });
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

  it.each(
    Object.entries(stacks)
  )("works with stack: %s", (key, expectedStack) => {
    mockedUseLocalDb.mockReturnValue([key, mockSetValue, vi.fn()]);

    const result = useRequiredStack();

    expect(result.stackKey).toBe(key);
    expect(result.stack).toBe(expectedStack);
    expect(result.stackOrder).toHaveLength(52);
  });
});
