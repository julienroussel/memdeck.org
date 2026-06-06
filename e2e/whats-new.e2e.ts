import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

const WHATS_NEW_URL_PATTERN = /\/whats-new\/?$/;
const WHATS_NEW_HEADING = /what.?s new/i;

test.describe("What's New page", () => {
  test("loads and lists changelog entries with localized dates", async ({
    page,
  }) => {
    await page.goto("/whats-new/");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(WHATS_NEW_URL_PATTERN);
    await expect(
      page.getByRole("heading", { level: 1, name: WHATS_NEW_HEADING })
    ).toBeVisible();

    // At least one entry renders, each with a machine-readable <time>.
    const times = page.locator("time");
    expect(await times.count()).toBeGreaterThan(0);
    await expect(times.first()).toBeVisible();
    const dateTime = await times.first().getAttribute("datetime");
    expect(dateTime).toBeTruthy();
    // The visible text is the localized render (formatReleaseDate), not the raw
    // ISO attribute — assert the year shows (TZ-safe, mirrors the unit test).
    await expect(times.first()).toContainText("2026");
  });

  test("reflows on a narrow mobile viewport without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/whats-new/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { level: 1, name: WHATS_NEW_HEADING })
    ).toBeVisible();
    await expect(page.locator("time").first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
