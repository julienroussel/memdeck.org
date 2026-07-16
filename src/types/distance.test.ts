import { describe, expect, it } from "vitest";
import { isDistanceConvention, isDistanceMode } from "./distance";

describe("isDistanceMode", () => {
  it.each(["compute", "apply", "both"])("accepts the valid value %s", (v) => {
    expect(isDistanceMode(v)).toBe(true);
  });

  it.each([null, undefined, 0, 1, true, false, {}, [], ""])(
    "rejects the non-string / non-mode value %p",
    (v) => {
      expect(isDistanceMode(v)).toBe(false);
    }
  );

  it("rejects an unrelated string", () => {
    expect(isDistanceMode("foo")).toBe(false);
  });

  it("rejects a convention value (no cross-pollution)", () => {
    expect(isDistanceMode("cyclic")).toBe(false);
    expect(isDistanceMode("signed")).toBe(false);
  });
});

describe("isDistanceConvention", () => {
  it.each(["cyclic", "signed"])("accepts the valid value %s", (v) => {
    expect(isDistanceConvention(v)).toBe(true);
  });

  it.each([null, undefined, 0, 1, true, false, {}, [], ""])(
    "rejects the non-string / non-convention value %p",
    (v) => {
      expect(isDistanceConvention(v)).toBe(false);
    }
  );

  it("rejects an unrelated string", () => {
    expect(isDistanceConvention("foo")).toBe(false);
  });

  it("rejects a mode value (no cross-pollution)", () => {
    expect(isDistanceConvention("compute")).toBe(false);
    expect(isDistanceConvention("apply")).toBe(false);
    expect(isDistanceConvention("both")).toBe(false);
  });
});
