import { expect } from "@playwright/test";
import { baseURL } from "./config";
import {
  CORRECT_ANSWERS_PATTERN,
  INCORRECT_ANSWERS_PATTERN,
} from "./fixtures/patterns";
import { test } from "./fixtures/test-setup";

// URL patterns
const HOME_URL_PATTERN = /\/$/;
const FLASHCARD_URL_PATTERN = /\/flashcard$/;
const RESOURCES_URL_PATTERN = /\/resources$/;

test.describe("Error Scenarios - RequireStack Guard", () => {
  test("should redirect to home when navigating to flashcard without selected stack", async ({
    page,
  }) => {
    // Navigate directly to flashcard without selecting a stack
    await page.goto("/flashcard");
    await page.waitForLoadState("networkidle");

    // Should be redirected to home page
    await expect(page).toHaveURL(HOME_URL_PATTERN);
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should redirect to home when navigating to ACAAN without selected stack", async ({
    page,
  }) => {
    // Navigate directly to ACAAN without selecting a stack
    await page.goto("/acaan");
    await page.waitForLoadState("networkidle");

    // Should be redirected to home page
    await expect(page).toHaveURL(HOME_URL_PATTERN);
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should redirect to home when navigating to toolbox without selected stack", async ({
    page,
  }) => {
    // Navigate directly to toolbox without selecting a stack
    await page.goto("/toolbox");
    await page.waitForLoadState("networkidle");

    // Should be redirected to home page
    await expect(page).toHaveURL(HOME_URL_PATTERN);
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should redirect to home when stack is cleared after navigation", async ({
    page,
  }) => {
    // Start by selecting a stack and navigating to flashcard
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on flashcard page
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);

    // Clear the stack from localStorage
    await page.evaluate(() => {
      localStorage.removeItem("memdeck-app-stack");
    });

    // Reload the page - should redirect to home
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(HOME_URL_PATTERN);
  });
});

test.describe("Error Scenarios - Invalid localStorage Data", () => {
  test("should handle corrupted session history JSON gracefully", async ({
    page,
  }) => {
    // Pre-populate localStorage with malformed JSON for session history
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-session-history", "{invalid json");
    });

    // Navigate to flashcard page (which reads session history)
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // App should still load without crashing
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);
    await expect(successBadge).toBeVisible();
    await expect(failBadge).toBeVisible();
  });

  test("should handle corrupted all-time stats JSON gracefully", async ({
    page,
  }) => {
    // Pre-populate localStorage with malformed JSON for stats
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem(
        "memdeck-app-all-time-stats",
        '{"invalid": "json" [missing closing brace'
      );
    });

    // Navigate to flashcard page
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("aronson");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // App should still load without crashing
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should handle non-JSON string in flashcard option gracefully", async ({
    page,
  }) => {
    // Pre-populate localStorage with invalid flashcard option
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-flashcard-option", "not-json-value");
    });

    // Navigate to flashcard
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // App should still load with default behavior
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should handle array type in place of expected object in localStorage", async ({
    page,
  }) => {
    // Pre-populate localStorage with wrong type
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-session-history", "[]");
      localStorage.setItem("memdeck-app-all-time-stats", '"string"');
    });

    // Navigate to flashcard
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("redford");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // App should handle type mismatch gracefully
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should handle null and undefined values in localStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-flashcard-option", "null");
      localStorage.setItem("memdeck-app-session-history", "undefined");
    });

    // Navigate to flashcard
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("particle");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // App should still work with null/undefined values
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });
});

test.describe("Error Scenarios - Invalid Stack Key", () => {
  test("should handle invalid stack key in localStorage", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Set invalid stack key
    await page.evaluate(() => {
      localStorage.setItem(
        "memdeck-app-stack",
        JSON.stringify("nonexistent-stack")
      );
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Stack picker should show no selection (empty value)
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("");

    // First-timer message should be visible since no valid stack is selected
    await expect(
      page.getByText("Hey there, first-timer!", { exact: false })
    ).toBeVisible();
  });

  test("should redirect protected pages when stack key becomes invalid", async ({
    page,
  }) => {
    // Start with valid stack selection
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);

    // Corrupt the stack key
    await page.evaluate(() => {
      localStorage.setItem(
        "memdeck-app-stack",
        JSON.stringify("invalid-stack-key")
      );
    });

    // Reload - should redirect to home
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(HOME_URL_PATTERN);
  });

  test("should handle malformed JSON for stack key", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Set malformed JSON for stack key
    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-stack", "{broken json");
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // App should still load, treating it as no selection
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
    await expect(
      page.getByText("Hey there, first-timer!", { exact: false })
    ).toBeVisible();
  });

  test("should handle non-string stack key values", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-stack", JSON.stringify(12_345));
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should treat as no valid stack
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("");
  });
});

test.describe("Error Scenarios - Direct URL Navigation", () => {
  test("should allow direct navigation to home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Home page should load without requiring stack
    await expect(page).toHaveURL(HOME_URL_PATTERN);
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should allow direct navigation to resources page", async ({ page }) => {
    await page.goto("/resources");
    await page.waitForLoadState("networkidle");

    // Resources page should load without requiring stack
    await expect(page).toHaveURL(RESOURCES_URL_PATTERN);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle direct navigation to non-existent route", async ({
    page,
  }) => {
    // Navigate to invalid route
    await page.goto("/this-route-does-not-exist");

    // Should either show 404 or redirect to home
    // The app uses GitHub Pages SPA setup which redirects to index.html
    await page.waitForLoadState("networkidle");

    // App should still be functional after invalid route
    await expect(page.locator("body")).toBeVisible();

    // Navigation should still work
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(HOME_URL_PATTERN);
  });

  test("should handle browser back button after redirect from protected route", async ({
    page,
  }) => {
    // Try to access protected route without stack
    await page.goto("/flashcard");
    await page.waitForLoadState("networkidle");

    // Should redirect to home
    await expect(page).toHaveURL(HOME_URL_PATTERN);

    // Navigate to resources
    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    // Press browser back button
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Should still be on a valid page (home)
    await expect(page).toHaveURL(HOME_URL_PATTERN);
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should handle forward navigation after going back from protected route", async ({
    page,
  }) => {
    // Start on home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Select stack and navigate to flashcard
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);

    // Go back to home
    await page.goBack();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(HOME_URL_PATTERN);

    // Clear stack selection
    await page.evaluate(() => {
      localStorage.removeItem("memdeck-app-stack");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Try to go forward - should either stay on home or redirect
    await page.goForward();
    await page.waitForLoadState("networkidle");

    // Should end up on home page due to RequireStack guard
    await expect(page).toHaveURL(HOME_URL_PATTERN);
  });
});

test.describe("Error Scenarios - Edge Cases", () => {
  test("should handle rapid stack switching", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const stackPicker = page.locator("[data-testid='stack-picker']").first();
    const stacks = [
      "mnemonica",
      "aronson",
      "redford",
      "particle",
      "memorandum",
    ];

    // Rapidly switch between stacks
    for (const stackKey of stacks) {
      await stackPicker.selectOption(stackKey);
      // Don't wait for networkidle - test rapid switching
    }

    // Wait for final state to settle
    await page.waitForLoadState("networkidle");

    // Final selection should be memorandum
    const selectedValue = await stackPicker.inputValue();
    expect(selectedValue).toBe("memorandum");

    // Should still be able to navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);
  });

  test("should handle extremely large localStorage data gracefully", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Create large but valid session history data
    await page.evaluate(() => {
      const stacks = [
        "mnemonica",
        "aronson",
        "memorandum",
        "redford",
        "particle",
      ];
      const modes = ["flashcard", "acaan"];
      const largeArray = Array.from({ length: 1000 }).map((_, i) => {
        const startedAt = new Date(
          Date.now() - (1000 - i) * 60_000
        ).toISOString();
        const endedAt = new Date(
          Date.now() - (1000 - i) * 60_000 + 300_000
        ).toISOString();
        return {
          id: `session-${i}`,
          mode: modes[i % modes.length],
          stackKey: stacks[i % stacks.length],
          config: { type: "structured", totalQuestions: 20 },
          startedAt,
          endedAt,
          durationSeconds: 300,
          successes: 10,
          fails: 5,
          questionsCompleted: 15,
          accuracy: 66.67,
          bestStreak: 5,
        };
      });
      localStorage.setItem(
        "memdeck-app-session-history",
        JSON.stringify(largeArray)
      );
    });

    // Select stack and navigate
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // App should still function
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should handle empty string in localStorage for required fields", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-stack", '""');
      localStorage.setItem("memdeck-app-flashcard-option", '""');
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should show first-timer message
    await expect(
      page.getByText("Hey there, first-timer!", { exact: false })
    ).toBeVisible();

    // Select stack and navigate
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("aronson");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Should work with default flashcard option
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should handle whitespace-only values in localStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("memdeck-app-stack", JSON.stringify("   "));
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should treat whitespace as invalid stack key
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("");
  });

  test("should handle page reload during active flashcard session", async ({
    page,
  }) => {
    // Start flashcard session
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Make some progress
    const cardSpreadItems = page.getByRole("option");
    if ((await cardSpreadItems.count()) > 0) {
      await cardSpreadItems.last().click({ force: true });
      // Brief wait to let the click register before reloading
      await page.waitForTimeout(500);
    }

    // Reload mid-session
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should restart session cleanly
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);
    await expect(successBadge).toBeVisible();
    await expect(failBadge).toBeVisible();
  });

  test("should handle multiple tabs with different stack selections", async ({
    browser,
  }) => {
    // Use a single browser context so both pages share localStorage
    const context = await browser.newContext({ baseURL });

    // Open first tab and select mnemonica
    const page1 = await context.newPage();
    await page1.goto("/");
    await page1.waitForLoadState("networkidle");

    await page1
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page1.waitForLoadState("networkidle");

    // Open second tab and select aronson (overwrites localStorage)
    const page2 = await context.newPage();
    await page2.goto("/");
    await page2.waitForLoadState("networkidle");

    await page2
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("aronson");
    await page2.waitForLoadState("networkidle");

    // Reload page1 — it should now see aronson since localStorage was overwritten
    await page1.reload();
    await page1.waitForLoadState("networkidle");

    const stack1 = await page1
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    const stack2 = await page2
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();

    expect(stack1).toBe("aronson");
    expect(stack2).toBe("aronson");

    // Both should be able to navigate to flashcard
    await page1.locator("a:has-text('Flashcard')").first().click();
    await page1.waitForLoadState("networkidle");
    await expect(page1).toHaveURL(FLASHCARD_URL_PATTERN);

    await page2.locator("a:has-text('Flashcard')").first().click();
    await page2.waitForLoadState("networkidle");
    await expect(page2).toHaveURL(FLASHCARD_URL_PATTERN);

    // Cleanup
    await context.close();
  });
});
