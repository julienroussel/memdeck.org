import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { describe, expect, it, vi } from "vitest";
import { LanguagePicker } from "../components/language-picker";
import { LANGUAGE_LSK } from "../constants";
import { WHATS_NEW_ENTRIES } from "../data/whats-new";
import { WhatsNew } from "../pages/whats-new/whats-new";
import { render } from "../test-utils";
import { formatReleaseDate } from "../utils/format-release-date";
import { languageLoaders } from "./language";
import fr from "./locales/fr.json";

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("../services/analytics", () => ({
  analytics: { trackError: vi.fn(), trackEvent: vi.fn() },
}));

describe("initial language load failure", () => {
  it("falls back to English everywhere, and the picker retries the failed locale", async () => {
    localStorage.setItem(LANGUAGE_LSK, "fr");
    // Not a stale-chunk TypeError, so changeLanguage rethrows instead of reloading.
    const frLoader = vi
      .spyOn(languageLoaders, "fr")
      .mockRejectedValue(new Error("network down"));

    // Imported here, after the spy, because the module starts loading on import.
    const { languageReady } = await import("./index");
    await expect(languageReady).rejects.toThrow("network down");

    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");

    render(
      <>
        <LanguagePicker />
        <WhatsNew />
      </>
    );

    const picker = screen.getByTestId("language-picker");
    expect(picker).toHaveValue("en");

    const [latest] = WHATS_NEW_ENTRIES;
    if (!latest) {
      throw new Error("WHATS_NEW_ENTRIES must be non-empty for this test");
    }
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent(
      latest.title.en
    );
    const withBody = WHATS_NEW_ENTRIES.find((entry) => entry.body);
    if (withBody?.body) {
      expect(screen.getByText(withBody.body.en)).toBeInTheDocument();
    }
    expect(
      screen.getAllByText(formatReleaseDate(latest.releasedAt, "en")).length
    ).toBeGreaterThan(0);

    frLoader.mockResolvedValueOnce({ default: fr });
    const user = userEvent.setup();
    await user.selectOptions(picker, "fr");

    await waitFor(() => {
      expect(i18n.language).toBe("fr");
    });
    expect(frLoader).toHaveBeenCalledTimes(2);
    expect(picker).toHaveValue("fr");
    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent(
      latest.title.fr
    );
  });
});
