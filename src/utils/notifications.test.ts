import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../constants";
import { buildWrongAnswerNotification } from "./notifications";

describe("buildWrongAnswerNotification", () => {
  it("returns a notification with translated title and message", () => {
    // Mock t to return the key so we can verify which keys are looked up.
    // `TFunction` is heavily overloaded and bound to the typed locale shape via
    // `CustomTypeOptions`; satisfying that surface for a test mock would require
    // duplicating its overload signatures. Test-only cast — justified.
    const mockT = ((key: string) => key) as unknown as TFunction;
    expect(buildWrongAnswerNotification(mockT)).toEqual({
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
      color: "red",
      message: "common.wrongAnswerMessage",
      title: "common.wrongAnswerTitle",
    });
  });
});
