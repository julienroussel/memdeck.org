import { describe, expect, it } from "vitest";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";
import {
  type DisplayMode,
  getRandomDisplayMode,
  wrongAnswerNotification,
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

describe("wrongAnswerNotification", () => {
  it("has the expected structure", () => {
    expect(wrongAnswerNotification).toEqual({
      color: "red",
      title: "Wrong answer",
      message: "Try again!",
      autoClose: NOTIFICATION_CLOSE_TIMEOUT,
    });
  });
});
