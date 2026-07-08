import { expect } from "@playwright/test";
import type { eventBus } from "../src/services/event-bus";
import { test } from "./fixtures/test-setup";

declare global {
  interface Window {
    __capturedStackLimitsChanges?: Array<{
      start: number;
      end: number;
      rangeSize: number;
      stackName: string;
    }>;
    __memdeckEventBus?: typeof eventBus;
  }
}

const STACK_RANGE_BADGE_PATTERN = /Stack range/;

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

  // Issue #639 regression: a corrupt `memdeck-app-stack-limits` blob used to
  // be silently replaced with "{}" on mount because Mantine's
  // `useLocalStorage` wrote the deserialize-fallback to disk during its mount
  // effect. The fix replaces that hook with `useSyncExternalStore`, which
  // never writes on mount. This test plants a typeguard-failing blob, reloads
  // a page that mounts `useStackLimits`, and asserts the on-disk bytes are
  // preserved byte-for-byte.
  test("should preserve a corrupt stack-limits blob across mount (issue #639)", async ({
    page,
  }) => {
    const corrupt = JSON.stringify("garbage-not-a-record");

    await page.evaluate((value) => {
      localStorage.setItem("memdeck-app-stack-limits", value);
    }, corrupt);

    await page.reload();
    await page.waitForLoadState("networkidle");

    // The range badge mounts useStackLimits; if mount-time auto-write were
    // still in place, the corrupt blob would now be "{}".
    const badge = page.getByRole("button", {
      name: STACK_RANGE_BADGE_PATTERN,
    });
    await expect(badge).toBeVisible();

    const onDisk = await page.evaluate(() =>
      localStorage.getItem("memdeck-app-stack-limits")
    );
    expect(onDisk).toBe(corrupt);
  });
});

// These tests opt out of the parent describe's `beforeEach` because they
// need to control the initial navigation themselves: test 1 must plant the
// corrupt blob before useStackLimits mounts, and both tests load with
// `?memdeck-e2e=1` so `window.__memdeckEventBus` is exposed (the
// production gate lives in `src/main.tsx`).
test.describe("Stack Limits — emit and corrupt-lock", () => {
  test("should refuse to overwrite a corrupt stack-limits blob when a preset is clicked", async ({
    page,
  }) => {
    const corrupt = JSON.stringify("garbage-not-a-record");

    await page.addInitScript((value) => {
      localStorage.setItem("memdeck-app-stack-limits", value);
    }, corrupt);

    await page.goto("/?memdeck-e2e=1");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.waitForFunction(() => window.__memdeckEventBus !== undefined);
    await page.evaluate(() => {
      const bus = window.__memdeckEventBus;
      if (!bus) {
        throw new Error("__memdeckEventBus not exposed");
      }
      window.__capturedStackLimitsChanges = [];
      bus.subscribe.STACK_LIMITS_CHANGED((payload) => {
        window.__capturedStackLimitsChanges?.push(payload);
      });
    });

    await page
      .getByRole("button", { name: "Stack range: 52 cards. Tap to adjust." })
      .click();
    const limitsControl = page.locator("[data-testid='stack-limits-control']");
    await limitsControl
      .getByRole("button", { name: "Set range to first 13 cards" })
      .click();
    await page.keyboard.press("Escape");

    const onDisk = await page.evaluate(() =>
      localStorage.getItem("memdeck-app-stack-limits")
    );
    expect(onDisk).toBe(corrupt);

    // Wait for the badge before checking the captured-emits array: the
    // visibility assertion is a positive UI settle signal that lets
    // Playwright drain any microtask the emit chain might use, replacing
    // an arbitrary timeout-based wait with a deterministic one.
    const badge = page.getByRole("button", {
      name: "Stack range: 52 cards. Tap to adjust.",
    });
    await expect(badge).toBeVisible();

    const captured = await page.evaluate(
      () => window.__capturedStackLimitsChanges
    );
    expect(captured).toEqual([]);
  });

  test("should emit STACK_LIMITS_CHANGED with the correct payload when a preset succeeds", async ({
    page,
  }) => {
    await page.goto("/?memdeck-e2e=1");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.waitForFunction(() => window.__memdeckEventBus !== undefined);
    await page.evaluate(() => {
      const bus = window.__memdeckEventBus;
      if (!bus) {
        throw new Error("__memdeckEventBus not exposed");
      }
      window.__capturedStackLimitsChanges = [];
      bus.subscribe.STACK_LIMITS_CHANGED((payload) => {
        window.__capturedStackLimitsChanges?.push(payload);
      });
    });

    await page
      .getByRole("button", { name: "Stack range: 52 cards. Tap to adjust." })
      .click();
    await page
      .locator("[data-testid='stack-limits-control']")
      .getByRole("button", { name: "Set range to first 13 cards" })
      .click();

    // Poll so the assertion retries if onSuccess ever becomes async — the
    // emit chain is synchronous today, but `expect.poll` removes the latent
    // race without changing semantics on the happy path.
    await expect
      .poll(() => page.evaluate(() => window.__capturedStackLimitsChanges))
      .toEqual([
        {
          end: 13,
          rangeSize: 13,
          stackName: "Tamariz",
          start: 1,
        },
      ]);
  });
});
