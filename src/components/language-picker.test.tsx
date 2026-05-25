import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { LanguagePicker } from "./language-picker";

const mockChangeLanguage = vi.fn();
vi.mock("../i18n/language", async () => {
  const actual =
    await vi.importActual<typeof import("../i18n/language")>(
      "../i18n/language"
    );
  return {
    ...actual,
    changeLanguage: (...args: unknown[]) => mockChangeLanguage(...args),
  };
});

const mockTrackEvent = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

const mockNotificationsShow = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: (...args: unknown[]) => mockNotificationsShow(...args),
  },
}));

beforeEach(() => {
  mockChangeLanguage.mockReset();
  mockTrackEvent.mockReset();
  mockNotificationsShow.mockReset();
});

describe("LanguagePicker", () => {
  it("fires analytics.trackEvent only after changeLanguage resolves", async () => {
    let resolvePromise: (() => void) | undefined;
    mockChangeLanguage.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePromise = resolve;
      })
    );

    const user = userEvent.setup();
    render(<LanguagePicker />);

    const select = screen.getByTestId("language-picker");
    await user.selectOptions(select, "fr");

    expect(mockChangeLanguage).toHaveBeenCalledWith("fr");
    expect(mockTrackEvent).not.toHaveBeenCalled();

    if (!resolvePromise) {
      throw new Error("Expected changeLanguage mock to be invoked");
    }
    resolvePromise();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "Settings",
        "Language Changed",
        "fr"
      );
    });
  });

  it("does NOT track analytics when changeLanguage rejects, and shows a red error notification", async () => {
    mockChangeLanguage.mockRejectedValue(new Error("locale load failed"));

    const user = userEvent.setup();
    render(<LanguagePicker />);

    const select = screen.getByTestId("language-picker");
    await user.selectOptions(select, "de");

    await waitFor(() => {
      expect(mockNotificationsShow).toHaveBeenCalledOnce();
    });
    // Assertion checks the rendered en translation. If the i18n key changes, update both
    // this assertion and the locale file in lockstep — there's no compile-time link.
    expect(mockNotificationsShow).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "red",
        message: "Something went wrong",
      })
    );
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
