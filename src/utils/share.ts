import { notifications } from "@mantine/notifications";
import i18next from "i18next";
import { SITE_NAME, SITE_URL } from "../constants";

/** Result of a share attempt */
export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** Whether the native Web Share API is available */
export const canNativeShare = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

/**
 * Shares MemDeck via the Web Share API (mobile) or copies the share message
 * to the clipboard (desktop fallback). A native share that fails for any
 * reason other than the user dismissing the sheet also falls back to the
 * clipboard.
 */
export const shareMemDeck = async (message: string): Promise<ShareResult> => {
  if (canNativeShare()) {
    try {
      await navigator.share({
        text: message,
        title: SITE_NAME,
        url: SITE_URL,
      });
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "cancelled";
      }
    }
  }

  // Clipboard fallback for desktop, or after a non-abort native share failure
  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "failed";
  }
};

/**
 * Shared user feedback for every share entry point: a toast for "copied" and
 * "failed"; nothing for "shared" (the native sheet was the feedback) or
 * "cancelled" (the user backed out on purpose).
 */
export const notifyShareResult = (result: ShareResult): void => {
  if (result === "copied") {
    notifications.show({ color: "green", message: i18next.t("share.copied") });
  } else if (result === "failed") {
    notifications.show({
      color: "red",
      message: i18next.t("errors.somethingWentWrong"),
    });
  }
};
