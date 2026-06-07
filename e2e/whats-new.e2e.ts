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

  test("nav 'New' badge shows on a fresh profile and clears after opening the page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const whatsNewNav = page
      .locator("#main-nav")
      .getByRole("link", { name: WHATS_NEW_HEADING });
    await expect(whatsNewNav).toBeVisible();
    // Visible "New" badge (UX) ...
    await expect(whatsNewNav.getByText("New", { exact: true })).toBeVisible();
    // ... and the screen-reader-only label (the a11y acceptance gate).
    await expect(whatsNewNav.getByText("Unseen updates")).toBeAttached();

    await whatsNewNav.click();
    await expect(page).toHaveURL(WHATS_NEW_URL_PATTERN);

    // Cleared live in the persistent navbar — no reload (same-tab dispatch).
    const navAfter = page
      .locator("#main-nav")
      .getByRole("link", { name: WHATS_NEW_HEADING });
    await expect(navAfter.getByText("New", { exact: true })).toHaveCount(0);
    await expect(
      page.locator("#main-nav").getByText("Unseen updates")
    ).toHaveCount(0);
  });
});
