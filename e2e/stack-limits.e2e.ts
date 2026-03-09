import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

test.describe("Stack Limits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Select Mnemonica stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");
  });

  test("should display stack range badge in navbar after selecting a stack", async ({
    page,
  }) => {
    // The badge should be visible next to the stack picker
    const badge = page.getByRole("button", {
      name: "Stack range: 52 cards. Tap to adjust.",
    });
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("52 cards");
  });

  test("should open modal with stack limits control when badge is clicked", async ({
    page,
  }) => {
    // Click the range badge
    await page
      .getByRole("button", {
        name: "Stack range: 52 cards. Tap to adjust.",
      })
      .click();

    // Modal should open with the full control
    const limitsControl = page.locator("[data-testid='stack-limits-control']");
    await expect(limitsControl).toBeVisible();

    // Preset buttons should be visible
    await expect(
      limitsControl.getByRole("button", {
        name: "Set range to first 13 cards",
      })
    ).toBeVisible();
    await expect(
      limitsControl.getByRole("button", {
        name: "Set range to first 26 cards",
      })
    ).toBeVisible();
    await expect(
      limitsControl.getByRole("button", {
        name: "Set range to first 39 cards",
      })
    ).toBeVisible();
    await expect(
      limitsControl.getByRole("button", {
        name: "Set range to first 52 cards",
      })
    ).toBeVisible();
  });

  test("should update badge when a preset is clicked", async ({ page }) => {
    // Open modal
    await page
      .getByRole("button", {
        name: "Stack range: 52 cards. Tap to adjust.",
      })
      .click();

    const limitsControl = page.locator("[data-testid='stack-limits-control']");

    // Click the "13" preset
    await limitsControl
      .getByRole("button", { name: "Set range to first 13 cards" })
      .click();

    // Description inside modal should update
    await expect(
      limitsControl.getByText("Positions 1–13 (13 cards)")
    ).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");

    // Badge should update — aria-label now reflects partial range
    const badge = page.getByRole("button", {
      name: "Stack range: positions 1 to 13. Tap to adjust.",
    });
    await expect(badge).toContainText("1–13");
  });

  test("should persist range across page reload", async ({ page }) => {
    // Open modal and set range
    await page
      .getByRole("button", {
        name: "Stack range: 52 cards. Tap to adjust.",
      })
      .click();
    const limitsControl = page.locator("[data-testid='stack-limits-control']");
    await limitsControl
      .getByRole("button", { name: "Set range to first 26 cards" })
      .click();
    await page.keyboard.press("Escape");

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Badge should still show the range
    const badge = page.getByRole("button", {
      name: "Stack range: positions 1 to 26. Tap to adjust.",
    });
    await expect(badge).toContainText("1–26");
  });

  test("should maintain per-stack limits independently", async ({ page }) => {
    // Set range to 13 for Mnemonica
    await page
      .getByRole("button", {
        name: "Stack range: 52 cards. Tap to adjust.",
      })
      .click();
    const limitsControl = page.locator("[data-testid='stack-limits-control']");
    await limitsControl
      .getByRole("button", { name: "Set range to first 13 cards" })
      .click();
    await page.keyboard.press("Escape");

    // Switch to Aronson stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("aronson");
    await page.waitForLoadState("networkidle");

    // Aronson should show full deck (default)
    const badge = page.getByRole("button", {
      name: "Stack range: 52 cards. Tap to adjust.",
    });
    await expect(badge).toContainText("52 cards");

    // Switch back to Mnemonica
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Mnemonica should still show 13
    const mnemonicaBadge = page.getByRole("button", {
      name: "Stack range: positions 1 to 13. Tap to adjust.",
    });
    await expect(mnemonicaBadge).toContainText("1–13");
  });
});
