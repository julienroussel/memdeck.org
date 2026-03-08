import { SITE_NAME, SITE_URL } from "../constants";

/** Result of a share attempt */
export type ShareResult = "shared" | "copied" | "failed";

/** Whether the native Web Share API is available */
export const canNativeShare = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/**
 * Shares MemDeck via the Web Share API (mobile) or copies the share message
 * to the clipboard (desktop fallback).
 */
export const shareMemDeck = async (message: string): Promise<ShareResult> => {
  if (canNativeShare()) {
    try {
      await navigator.share({
        title: SITE_NAME,
        text: message,
        url: SITE_URL,
      });
      return "shared";
    } catch {
      // User cancelled or share failed — not an error worth surfacing
      return "failed";
    }
  }

  // Clipboard fallback for desktop
  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "failed";
  }
};
