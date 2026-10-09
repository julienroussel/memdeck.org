import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { LanguageLoadNotifier } from "./language-load-notifier";

const mockNotificationsShow = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: (...args: unknown[]) => mockNotificationsShow(...args),
  },
}));

vi.mock("../i18n", () => {
  const languageReady = Promise.reject(new Error("locale chunk failed"));
  // Mirrors src/i18n/index.ts: the rejection is observed up front so it is not
  // reported as unhandled before the component attaches its own handler.
  languageReady.catch(() => {
    // intentional no-op
  });
  return { languageReady };
});

describe("LanguageLoadNotifier", () => {
  it("shows the language-load-failed notification exactly once across a re-render", async () => {
    const { rerender } = render(<LanguageLoadNotifier />);
    rerender(<LanguageLoadNotifier />);

    await waitFor(() => {
      expect(mockNotificationsShow).toHaveBeenCalled();
    });
    expect(mockNotificationsShow).toHaveBeenCalledOnce();
    expect(mockNotificationsShow).toHaveBeenCalledWith({
      color: "orange",
      message: "Could not load your preferred language. Using English.",
    });
  });
});
