import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.CI
  ? "http://localhost:4173"
  : "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  webServer: {
    command: process.env.CI ? "pnpm run preview" : "pnpm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
