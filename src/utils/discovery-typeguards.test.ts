import { describe, expect, it } from "vitest";
import { isFeatureDiscoveryState } from "./discovery-typeguards";

describe("isFeatureDiscoveryState", () => {
  it("accepts a well-formed state", () => {
    expect(
      isFeatureDiscoveryState({
        dismissed: ["mode-spotcheck"],
        snoozedUntil: 4,
      })
    ).toBe(true);
  });

  it("accepts an empty dismissed list and zero snooze", () => {
    expect(isFeatureDiscoveryState({ dismissed: [], snoozedUntil: 0 })).toBe(
      true
    );
  });

  it("rejects null and non-objects", () => {
    expect(isFeatureDiscoveryState(null)).toBe(false);
    expect(isFeatureDiscoveryState("nope")).toBe(false);
    expect(isFeatureDiscoveryState(42)).toBe(false);
  });

  it("rejects objects missing required fields", () => {
    expect(isFeatureDiscoveryState({ dismissed: [] })).toBe(false);
    expect(isFeatureDiscoveryState({ snoozedUntil: 0 })).toBe(false);
  });

  it("rejects a non-array dismissed", () => {
    expect(
      isFeatureDiscoveryState({ dismissed: "mode-spotcheck", snoozedUntil: 0 })
    ).toBe(false);
  });

  it("rejects a dismissed list containing a non-string", () => {
    expect(
      isFeatureDiscoveryState({ dismissed: ["ok", 3], snoozedUntil: 0 })
    ).toBe(false);
  });

  it("rejects a non-number snoozedUntil", () => {
    expect(isFeatureDiscoveryState({ dismissed: [], snoozedUntil: "5" })).toBe(
      false
    );
  });

  it("rejects a non-finite snoozedUntil", () => {
    expect(
      isFeatureDiscoveryState({ dismissed: [], snoozedUntil: Number.NaN })
    ).toBe(false);
  });
});
