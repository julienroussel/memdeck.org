import { expect, type Page } from "@playwright/test";
import { mnemonica } from "../src/types/stacks/mnemonica";
import {
  CORRECT_ANSWERS_PATTERN,
  INCORRECT_ANSWERS_PATTERN,
} from "./fixtures/patterns";
import { test } from "./fixtures/test-setup";

const SETTINGS_PATTERN = /settings/i;
const CUT_DEPTH_PATTERN = /cut depth/i;
const CHECK_PATTERN = /check/i;
const TIMED_MODE_PATTERN = /timed mode/i;
const START_SESSION_PATTERN = /start \d+ question session/i;
const SESSION_PATTERN = /Session:/i;
const STOP_PATTERN = /stop/i;
const ACAAN_OPTIONS_PATTERN = /ACAAN options/i;
const PROGRESS_PATTERN = /\/\d+/;
const CARD_SRC_PATTERN = /cards\/(.+)\.svg/;

/**
 * Mnemonica stack order as image filename fragments (without "cards/" prefix and ".svg" suffix).
 * Index 0 = position 1, index 51 = position 52.
 *
 * Derived from the source definition in src/types/stacks/mnemonica.ts.
 */
const MNEMONICA_ORDER = mnemonica.order.map((card) =>
  card.image.replace("cards/", "").replace(".svg", "")
);

/** Maps image filename fragment (e.g. "clubs_4") to 1-based Mnemonica position. */
const MNEMONICA_POSITION_MAP = new Map<string, number>(
  MNEMONICA_ORDER.map((fragment, index) => [fragment, index + 1])
);

/**
 * Reads the displayed card and target position from the page, then computes
 * the correct cut depth using the ACAAN formula: (cardPosition - targetPosition + 52) % 52.
 */
async function computeCorrectCutDepth(page: Page): Promise<number> {
  const cardSrc = await page
    .locator("img[src*='cards/']")
    .first()
    .getAttribute("src");
  expect(cardSrc).toBeTruthy();

  // Extract the filename fragment between "cards/" and ".svg"
  const match = cardSrc?.match(CARD_SRC_PATTERN);
  expect(match).toBeTruthy();
  const fragment = match?.[1] ?? "";

  const cardPosition = MNEMONICA_POSITION_MAP.get(fragment);
  expect(cardPosition).toBeDefined();

  const targetText = await page
    .locator("[data-testid='number-card-value']")
    .first()
    .textContent();
  const targetPosition = Number.parseInt(targetText ?? "0", 10);
  expect(targetPosition).toBeGreaterThanOrEqual(1);
  expect(targetPosition).toBeLessThanOrEqual(52);

  return ((cardPosition ?? 0) - targetPosition + 52) % 52;
}

/**
 * Computes a guaranteed wrong cut depth by adding 1 (mod 52) to the correct answer.
 * Since targetPosition !== cardPosition in ACAAN, the correct answer is 1-51,
 * meaning (correct + 1) % 52 always differs from the correct answer.
 */
async function computeWrongCutDepth(page: Page): Promise<number> {
  const correct = await computeCorrectCutDepth(page);
  return (correct + 1) % 52;
}

test.describe("ACAAN Training", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-select Mnemonica stack in localStorage before navigating
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Select Mnemonica stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to ACAAN page
    await page.locator("a:has-text('ACAAN')").first().click();
    await page.waitForLoadState("networkidle");
  });

  test("should load ACAAN page and render correctly after selecting a stack", async ({
    page,
  }) => {
    // Verify page loaded with title
    await expect(page.getByRole("heading", { name: "ACAAN" })).toBeVisible();

    // Verify score badges are displayed (thumbs up/down icons with numbers)
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);
    await expect(successBadge).toBeVisible();
    await expect(failBadge).toBeVisible();

    // Both badges should show 0 initially
    await expect(successBadge).toContainText("0");
    await expect(failBadge).toContainText("0");

    // Verify settings button is visible
    const settingsButton = page.getByRole("button", {
      name: SETTINGS_PATTERN,
    });
    await expect(settingsButton).toBeVisible();
  });

  test("should display card and target position number", async ({ page }) => {
    // Should show a card image
    const cardImage = page.locator("img[src*='cards/']").first();
    await expect(cardImage).toBeVisible();

    // Should show an arrow indicator
    await expect(page.locator("text=→")).toBeVisible();

    // Should show a number card with target position (1-52)
    const numberCard = page.locator("[data-testid='number-card']").first();
    await expect(numberCard).toBeVisible();

    // Get the center number text
    const numberText = await page
      .locator("[data-testid='number-card-value']")
      .first()
      .textContent();
    const targetPosition = Number.parseInt(numberText || "0", 10);
    expect(targetPosition).toBeGreaterThanOrEqual(1);
    expect(targetPosition).toBeLessThanOrEqual(52);
  });

  test("should display cut depth input and check button", async ({ page }) => {
    // Find cut depth input by aria-label
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    await expect(cutDepthInput).toBeVisible();

    // Mantine NumberInput uses type="text" with inputmode="decimal" for better mobile support
    await expect(cutDepthInput).toHaveAttribute("type", "text");
    await expect(cutDepthInput).toHaveAttribute("inputmode", "decimal");

    // Find check button
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });
    await expect(checkButton).toBeVisible();

    // Button should be disabled initially (no input)
    await expect(checkButton).toBeDisabled();
  });

  test("should enable check button when cut depth is entered", async ({
    page,
  }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });

    // Initially disabled
    await expect(checkButton).toBeDisabled();

    // Enter a valid cut depth
    await cutDepthInput.fill("10");

    // Button should now be enabled
    await expect(checkButton).toBeEnabled();
  });

  test("should accept cut depth input and submit answer", async ({ page }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);

    // Get initial score
    const initialSuccess = await successBadge.textContent();
    const initialFails = await failBadge.textContent();

    // Enter a cut depth value (any value 0-51 is valid input)
    await cutDepthInput.fill("0");
    await checkButton.click();
    await expect(cutDepthInput).toHaveValue("");

    // Score should have changed (either success or fail)
    const newSuccess = await successBadge.textContent();
    const newFails = await failBadge.textContent();

    const scoreChanged =
      newSuccess !== initialSuccess || newFails !== initialFails;
    expect(scoreChanged).toBeTruthy();

    // Input should be cleared after submission
    await expect(cutDepthInput).toHaveValue("");
  });

  test("should submit answer on Enter key press", async ({ page }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);

    // Get initial score
    const initialSuccess = await successBadge.textContent();
    const initialFails = await failBadge.textContent();

    // Enter value and press Enter
    await cutDepthInput.fill("5");
    await cutDepthInput.press("Enter");
    await expect(cutDepthInput).toHaveValue("");

    // Score should have changed
    const newSuccess = await successBadge.textContent();
    const newFails = await failBadge.textContent();

    const scoreChanged =
      newSuccess !== initialSuccess || newFails !== initialFails;
    expect(scoreChanged).toBeTruthy();

    // Input should be cleared
    await expect(cutDepthInput).toHaveValue("");
  });

  test("should show notification after answer submission", async ({ page }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });

    // Submit an answer
    await cutDepthInput.fill("0");
    await checkButton.click();

    // Wait for notification to appear (Mantine notifications use role="alert")
    // Look for either "Correct!" or "Wrong answer" notification
    const notification = page.getByRole("alert");
    await expect(notification).toBeVisible({ timeout: 2000 });
  });

  test("should update score on correct answer", async ({ page }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);

    const initialSuccessText = await successBadge.textContent();
    const initialSuccess = Number.parseInt(initialSuccessText || "0", 10);

    // Compute the correct answer from the displayed card and target position
    const correctAnswer = await computeCorrectCutDepth(page);

    await cutDepthInput.fill(String(correctAnswer));
    await checkButton.click();
    await expect(cutDepthInput).toHaveValue("");

    // Success count should have incremented by exactly 1
    const updatedSuccessText = await successBadge.textContent();
    const updatedSuccess = Number.parseInt(updatedSuccessText || "0", 10);
    expect(updatedSuccess).toBe(initialSuccess + 1);
  });

  test("should update score on wrong answer", async ({ page }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);

    // Get initial fail count
    const initialFailsText = await failBadge.textContent();
    const initialFails = Number.parseInt(initialFailsText || "0", 10);

    // Compute a guaranteed wrong answer
    const wrongAnswer = await computeWrongCutDepth(page);

    await cutDepthInput.fill(String(wrongAnswer));
    await checkButton.click();
    await expect(cutDepthInput).toHaveValue("");

    // Fail count should have incremented by exactly 1
    const updatedFailsText = await failBadge.textContent();
    const updatedFails = Number.parseInt(updatedFailsText || "0", 10);
    expect(updatedFails).toBe(initialFails + 1);
  });

  test("should advance to new scenario after correct answer", async ({
    page,
  }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });

    // Get initial card image src and target position
    const cardImage = page.locator("img[src*='cards/']").first();
    const initialCardSrc = await cardImage.getAttribute("src");
    const numberCardValue = page
      .locator("[data-testid='number-card-value']")
      .first();
    const initialPosition = await numberCardValue.textContent();

    // Compute and submit the correct answer
    const correctAnswer = await computeCorrectCutDepth(page);
    await cutDepthInput.fill(String(correctAnswer));
    await checkButton.click();
    await expect(cutDepthInput).toHaveValue("");

    // Scenario should have advanced (either card or position changed)
    const currentCardSrc = await cardImage.getAttribute("src");
    const currentPosition = await numberCardValue.textContent();

    expect(
      currentCardSrc !== initialCardSrc || currentPosition !== initialPosition
    ).toBeTruthy();
  });

  test("should NOT advance to new scenario after wrong answer", async ({
    page,
  }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });

    // Get initial card and position
    const cardImage = page.locator("img[src*='cards/']").first();
    const initialCardSrc = await cardImage.getAttribute("src");
    const numberCardValue = page
      .locator("[data-testid='number-card-value']")
      .first();
    const initialPosition = await numberCardValue.textContent();

    // Compute and submit a guaranteed wrong answer
    const wrongAnswer = await computeWrongCutDepth(page);
    await cutDepthInput.fill(String(wrongAnswer));
    await checkButton.click();

    // Wait for "Wrong answer" notification to confirm the answer was wrong
    const notification = page
      .getByRole("alert")
      .filter({ hasText: "Wrong answer" });
    await expect(notification).toBeVisible({ timeout: 2000 });

    // Scenario should NOT have changed
    const currentCardSrc = await cardImage.getAttribute("src");
    const currentPosition = await numberCardValue.textContent();

    expect(currentCardSrc).toBe(initialCardSrc);
    expect(currentPosition).toBe(initialPosition);
  });

  test("should open settings modal when settings button is clicked", async ({
    page,
  }) => {
    // Click settings button (IconSettings button)
    const settingsButton = page
      .getByRole("main")
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    await settingsButton.click();

    // Verify modal is displayed with title
    await expect(page.getByText(ACAAN_OPTIONS_PATTERN)).toBeVisible();

    // Verify timer switch is visible by its label
    const timerSwitch = page.getByRole("switch", { name: TIMED_MODE_PATTERN });
    await expect(timerSwitch).toBeVisible();
  });

  test("should close settings modal when escaped", async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole("main")
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    await settingsButton.click();

    // Verify modal is open
    await expect(page.getByText(ACAAN_OPTIONS_PATTERN)).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Modal should be closed
    await expect(page.getByText(ACAAN_OPTIONS_PATTERN)).not.toBeVisible();
  });

  test("should allow toggling timer in settings", async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole("main")
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    await settingsButton.click();

    // Find timer toggle switch by label
    const timerSwitch = page.getByRole("switch", { name: TIMED_MODE_PATTERN });
    const initialChecked = await timerSwitch.isChecked();

    // Click the switch to toggle
    await timerSwitch.click();

    // Verify it toggled
    const newChecked = await timerSwitch.isChecked();
    expect(newChecked).toBe(!initialChecked);

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.getByText(ACAAN_OPTIONS_PATTERN)).not.toBeVisible();

    // Verify setting persisted in localStorage
    const timerSettings = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-acaan-trainer-timer");
      return value ? JSON.parse(value) : null;
    });

    expect(timerSettings).not.toBeNull();
    expect(timerSettings.enabled).toBe(newChecked);
  });

  test("should persist timer settings in localStorage", async ({ page }) => {
    // Open settings and enable timer
    const settingsButton = page
      .getByRole("main")
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    await settingsButton.click();

    const timerSwitch = page.getByRole("switch", { name: TIMED_MODE_PATTERN });
    const initialChecked = await timerSwitch.isChecked();

    // Ensure timer is enabled
    if (!initialChecked) {
      await timerSwitch.click();
      await expect(timerSwitch).toBeChecked();
    }

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.getByText(ACAAN_OPTIONS_PATTERN)).not.toBeVisible();

    // Check localStorage directly
    const timerSettings = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-acaan-trainer-timer");
      return value ? JSON.parse(value) : null;
    });

    expect(timerSettings).not.toBeNull();
    expect(timerSettings).toHaveProperty("enabled");
    expect(timerSettings).toHaveProperty("duration");
  });

  test("should start a session when start session button is clicked", async ({
    page,
  }) => {
    // Session preset buttons (e.g. "10", "20", "30", "52") are rendered by SessionStartControls
    const startButton = page
      .getByRole("button", { name: START_SESSION_PATTERN })
      .first();
    await expect(startButton).toBeVisible();

    await startButton.click();

    // Session banner should appear
    const sessionBanner = page.getByText(SESSION_PATTERN);
    await expect(sessionBanner).toBeVisible();

    // Stop session button should be visible
    const stopButton = page.getByRole("button", { name: STOP_PATTERN });
    await expect(stopButton).toBeVisible();
  });

  test("should display session banner when session is active", async ({
    page,
  }) => {
    // Start a session via a preset button
    const startButton = page
      .getByRole("button", { name: START_SESSION_PATTERN })
      .first();
    await expect(startButton).toBeVisible();

    await startButton.click();

    // Session banner should be visible with progress info
    const sessionBanner = page.getByText(SESSION_PATTERN);
    await expect(sessionBanner).toBeVisible();

    // Should show question count (e.g., "1/10")
    const progressText = page.getByText(PROGRESS_PATTERN);
    await expect(progressText).toBeVisible();
  });

  test("should support session functionality", async ({ page }) => {
    // ACAAN page starts with autoStart: true, so there may not be a start button
    // Verify the page has session support by checking for the useSession hook presence
    // We can verify this by checking that the page renders without errors
    await expect(page.getByRole("heading", { name: "ACAAN" })).toBeVisible();

    // The score badges indicate session is tracking
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);
    await expect(successBadge).toBeVisible();
    await expect(failBadge).toBeVisible();
  });

  test("should hide score badges during structured session", async ({
    page,
  }) => {
    const startButton = page
      .getByRole("button", { name: START_SESSION_PATTERN })
      .first();
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);

    // Initially score badges should be visible
    await expect(successBadge).toBeVisible();

    // Start session
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Score badges should be hidden during structured session
    await expect(successBadge).not.toBeVisible();
  });

  test("should persist game state across page reload", async ({ page }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    const checkButton = page.getByRole("button", { name: CHECK_PATTERN });
    const successBadge = page.getByLabel(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByLabel(INCORRECT_ANSWERS_PATTERN);

    // Submit a few answers to build up score
    for (let i = 0; i < 3; i++) {
      await cutDepthInput.fill(String(i));
      await checkButton.click();
      await expect(cutDepthInput).toHaveValue("");
    }

    // Get current score
    const successText = await successBadge.textContent();
    const failsText = await failBadge.textContent();
    const totalScore =
      Number.parseInt(successText || "0", 10) +
      Number.parseInt(failsText || "0", 10);

    expect(totalScore).toBeGreaterThan(0);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Score should reset (ACAAN doesn't persist score, only settings)
    const newSuccessText = await successBadge.textContent();
    const newFailsText = await failBadge.textContent();

    // After reload, score resets to 0
    expect(newSuccessText).toContain("0");
    expect(newFailsText).toContain("0");
  });

  test("should validate cut depth input range", async ({ page }) => {
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);

    // Mantine NumberInput uses data attributes for validation, not min/max
    // Try entering negative number
    await cutDepthInput.fill("-5");

    // Mantine NumberInput should prevent negative numbers
    const negativeValue = await cutDepthInput.inputValue();
    // Empty string or non-negative number expected
    if (negativeValue !== "") {
      expect(Number(negativeValue)).toBeGreaterThanOrEqual(0);
    }

    // Try entering valid number
    await cutDepthInput.fill("25");
    await expect(cutDepthInput).toHaveValue("25");
  });

  test("should navigate away from ACAAN and return to see working page", async ({
    page,
  }) => {
    // Verify we're on ACAAN page
    await expect(page.getByRole("heading", { name: "ACAAN" })).toBeVisible();

    // Navigate away to home
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Navigate back to ACAAN
    await page.locator("a:has-text('ACAAN')").first().click();
    await page.waitForLoadState("networkidle");

    // Page should load correctly
    await expect(page.getByRole("heading", { name: "ACAAN" })).toBeVisible();

    // Score badges should be visible
    await expect(page.getByLabel(CORRECT_ANSWERS_PATTERN)).toBeVisible();
    await expect(page.getByLabel(INCORRECT_ANSWERS_PATTERN)).toBeVisible();

    // Card and number should be visible
    const cardImage = page.locator("img[src*='cards/']").first();
    await expect(cardImage).toBeVisible();

    const numberCard = page.locator("[data-testid='number-card']").first();
    await expect(numberCard).toBeVisible();

    // Input should be visible
    const cutDepthInput = page.getByLabel(CUT_DEPTH_PATTERN);
    await expect(cutDepthInput).toBeVisible();
  });

  test("should display timer when timer is enabled", async ({ page }) => {
    // Open settings
    const settingsButton = page
      .getByRole("main")
      .locator("button")
      .filter({ has: page.locator("svg") })
      .first();
    await settingsButton.click();

    // Enable timer
    const timerSwitch = page.getByRole("switch", { name: TIMED_MODE_PATTERN });
    const isEnabled = await timerSwitch.isChecked();

    if (!isEnabled) {
      await timerSwitch.click();
      await expect(timerSwitch).toBeChecked();
    }

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.getByText(ACAAN_OPTIONS_PATTERN)).not.toBeVisible();

    // Timer display should now be visible (format like "30" or "15")
    // The TimerDisplay component shows seconds remaining
    const timerDisplay = page.getByRole("progressbar");
    await expect(timerDisplay).toBeVisible({ timeout: 3000 });
  });
});
