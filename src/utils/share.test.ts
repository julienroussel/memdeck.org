import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_NAME, SITE_URL } from "../constants";
import { canNativeShare, notifyShareResult, shareMemDeck } from "./share";

const mockNotificationsShow = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: (...args: unknown[]) => mockNotificationsShow(...args),
  },
}));

const TEST_MESSAGE = "Test share message";

beforeEach(() => {
  mockNotificationsShow.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("canNativeShare", () => {
  it("returns true when navigator.share is available", () => {
    vi.stubGlobal("navigator", { share: vi.fn() });
    expect(canNativeShare()).toBe(true);
  });

  it("returns false when navigator.share is unavailable", () => {
    vi.stubGlobal("navigator", {});
    expect(canNativeShare()).toBe(false);
  });
});

describe("shareMemDeck", () => {
  it("uses native share when available and returns 'shared'", async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share: shareFn });

    const result = await shareMemDeck(TEST_MESSAGE);

    expect(result).toBe("shared");
    // Native share passes structured data (title, text, url separately)
    expect(shareFn).toHaveBeenCalledWith({
      text: TEST_MESSAGE,
      title: SITE_NAME,
      url: SITE_URL,
    });
  });

  it("returns 'cancelled' without touching the clipboard when the user dismisses the share sheet", async () => {
    const shareFn = vi
      .fn()
      .mockRejectedValue(new DOMException("Share canceled", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText }, share: shareFn });

    const result = await shareMemDeck(TEST_MESSAGE);

    expect(result).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard and returns 'copied' when native share fails for a non-abort reason", async () => {
    const shareFn = vi
      .fn()
      .mockRejectedValue(new DOMException("Not allowed", "NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText }, share: shareFn });

    const result = await shareMemDeck(TEST_MESSAGE);

    expect(result).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(TEST_MESSAGE);
  });

  it("returns 'failed' when native share fails and the clipboard fallback also fails", async () => {
    const shareFn = vi
      .fn()
      .mockRejectedValue(new DOMException("Not allowed", "NotAllowedError"));
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText }, share: shareFn });

    const result = await shareMemDeck(TEST_MESSAGE);

    expect(result).toBe("failed");
  });

  it("copies to clipboard when native share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const result = await shareMemDeck(TEST_MESSAGE);

    expect(result).toBe("copied");
    // Clipboard fallback copies the message text only (URL is embedded in the i18n message string)
    expect(writeText).toHaveBeenCalledWith(TEST_MESSAGE);
  });

  it("returns 'failed' when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const result = await shareMemDeck(TEST_MESSAGE);

    expect(result).toBe("failed");
  });

  it("returns 'failed' when clipboard API is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const result = await shareMemDeck(TEST_MESSAGE);
    expect(result).toBe("failed");
  });
});

describe("notifyShareResult", () => {
  // Assertions check the rendered en translations. If an i18n key changes,
  // update these and the locale file in lockstep.
  it("shows a green 'Link copied!' toast for 'copied'", () => {
    notifyShareResult("copied");
    expect(mockNotificationsShow).toHaveBeenCalledWith({
      color: "green",
      message: "Link copied!",
    });
  });

  it("shows a red error toast for 'failed'", () => {
    notifyShareResult("failed");
    expect(mockNotificationsShow).toHaveBeenCalledWith({
      color: "red",
      message: "Something went wrong",
    });
  });

  it("shows nothing for 'shared'", () => {
    notifyShareResult("shared");
    expect(mockNotificationsShow).not.toHaveBeenCalled();
  });

  it("shows nothing for 'cancelled'", () => {
    notifyShareResult("cancelled");
    expect(mockNotificationsShow).not.toHaveBeenCalled();
  });
});
