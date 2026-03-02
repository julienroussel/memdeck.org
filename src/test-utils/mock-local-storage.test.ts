import { beforeEach, describe, expect, it } from "vitest";
import { createMockLocalStorage } from "./mock-local-storage";

describe("createMockLocalStorage", () => {
  let mockLocalStorage: ReturnType<
    typeof createMockLocalStorage
  >["mockLocalStorage"];

  beforeEach(() => {
    ({ mockLocalStorage } = createMockLocalStorage());
  });

  describe("getItem", () => {
    it("returns the value for an existing key", () => {
      mockLocalStorage.setItem("color", "red");
      expect(mockLocalStorage.getItem("color")).toBe("red");
    });

    it("returns null for a non-existent key", () => {
      expect(mockLocalStorage.getItem("missing")).toBeNull();
    });
  });

  describe("setItem", () => {
    it("stores a value that can be retrieved", () => {
      mockLocalStorage.setItem("fruit", "apple");
      expect(mockLocalStorage.getItem("fruit")).toBe("apple");
    });

    it("overwrites an existing value", () => {
      mockLocalStorage.setItem("fruit", "apple");
      mockLocalStorage.setItem("fruit", "banana");
      expect(mockLocalStorage.getItem("fruit")).toBe("banana");
    });
  });

  describe("removeItem", () => {
    it("removes an existing key", () => {
      mockLocalStorage.setItem("fruit", "apple");
      mockLocalStorage.removeItem("fruit");
      expect(mockLocalStorage.getItem("fruit")).toBeNull();
    });

    it("does nothing when removing a non-existent key", () => {
      mockLocalStorage.removeItem("missing");
      expect(mockLocalStorage.length).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes all stored items", () => {
      mockLocalStorage.setItem("a", "1");
      mockLocalStorage.setItem("b", "2");
      mockLocalStorage.clear();
      expect(mockLocalStorage.length).toBe(0);
      expect(mockLocalStorage.getItem("a")).toBeNull();
    });
  });

  describe("length", () => {
    it("returns 0 when storage is empty", () => {
      expect(mockLocalStorage.length).toBe(0);
    });

    it("returns the number of stored items", () => {
      mockLocalStorage.setItem("a", "1");
      mockLocalStorage.setItem("b", "2");
      expect(mockLocalStorage.length).toBe(2);
    });

    it("decreases when an item is removed", () => {
      mockLocalStorage.setItem("a", "1");
      mockLocalStorage.setItem("b", "2");
      mockLocalStorage.removeItem("a");
      expect(mockLocalStorage.length).toBe(1);
    });
  });

  describe("key", () => {
    it("returns null when storage is empty", () => {
      expect(mockLocalStorage.key(0)).toBeNull();
    });

    it("returns null for an out-of-bounds index", () => {
      mockLocalStorage.setItem("a", "1");
      expect(mockLocalStorage.key(5)).toBeNull();
    });

    it("returns null for a negative index", () => {
      mockLocalStorage.setItem("a", "1");
      expect(mockLocalStorage.key(-1)).toBeNull();
    });

    it("returns the key at the given index after items are set", () => {
      mockLocalStorage.setItem("alpha", "1");
      mockLocalStorage.setItem("beta", "2");
      expect(mockLocalStorage.key(0)).toBe("alpha");
      expect(mockLocalStorage.key(1)).toBe("beta");
    });

    it("returns keys in insertion order", () => {
      mockLocalStorage.setItem("c", "3");
      mockLocalStorage.setItem("a", "1");
      mockLocalStorage.setItem("b", "2");
      expect(mockLocalStorage.key(0)).toBe("c");
      expect(mockLocalStorage.key(1)).toBe("a");
      expect(mockLocalStorage.key(2)).toBe("b");
    });
  });
});
