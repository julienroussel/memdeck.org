import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE_NAME, SITE_URL } from "../constants";
import { canNativeShare, shareMemDeck } from "./share";

const TEST_MESSAGE = "Test share message";

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
      title: SITE_NAME,
      text: TEST_MESSAGE,
      url: SITE_URL,
    });
  });

  it("returns 'failed' when native share is cancelled", async () => {
    const shareFn = vi.fn().mockRejectedValue(new Error("cancelled"));
    vi.stubGlobal("navigator", { share: shareFn });

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
