import { describe, expect, it } from "vitest";
import { SHARE_NUDGE_MIN_SESSIONS } from "../constants";
import { isShareNudgePending } from "./share-nudge-eligibility";

describe("isShareNudgePending", () => {
  it("is false when dismissed, regardless of session count", () => {
    expect(isShareNudgePending(true, SHARE_NUDGE_MIN_SESSIONS + 10)).toBe(
      false
    );
  });

  it("is false below the session threshold", () => {
    expect(isShareNudgePending(false, SHARE_NUDGE_MIN_SESSIONS - 1)).toBe(
      false
    );
  });

  it("is true at the threshold when not dismissed", () => {
    expect(isShareNudgePending(false, SHARE_NUDGE_MIN_SESSIONS)).toBe(true);
  });

  it("is true above the threshold when not dismissed", () => {
    expect(isShareNudgePending(false, SHARE_NUDGE_MIN_SESSIONS + 1)).toBe(true);
  });
});
