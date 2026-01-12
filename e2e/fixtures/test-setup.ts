import { test as base } from "@playwright/test";

/**
 * Extended test fixture for e2e tests.
 * Playwright provides fresh browser context per test by default,
 * which means localStorage is automatically empty for each test.
 */
export const test = base;
