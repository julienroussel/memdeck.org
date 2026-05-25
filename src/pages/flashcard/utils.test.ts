import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import {
  buildWrongAnswerNotification,
  type DisplayMode,
  getRandomDisplayMode,
} from "./utils";

describe("getRandomDisplayMode", () => {
  it("returns a valid display mode", () => {
    const mode = getRandomDisplayMode();
    expect(["card", "index"]).toContain(mode);
  });

  it("returns both modes across many calls", () => {
    const results = new Set<DisplayMode>();
    for (let i = 0; i < 100; i++) {
      results.add(getRandomDisplayMode());
    }
    expect(results.has("card")).toBe(true);
    expect(results.has("index")).toBe(true);
  });
});

describe("buildWrongAnswerNotification", () => {
  it("returns a notification with translated title and message", () => {
    // Mock t to return the key so we can verify which keys are looked up.
    // `TFunction` is heavily overloaded and bound to the typed locale shape via
    // `CustomTypeOptions`; satisfying that surface for a test mock would require
    // duplicating its overload signatures. Test-only cast — justified.
    const mockT = ((key: string) => key) as unknown as TFunction;
    expect(buildWrongAnswerNotification(mockT)).toEqual({
      color: "red",
      title: "common.wrongAnswerTitle",
      message: "common.wrongAnswerMessage",
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
  });
});
