import { defineConfig, devices } from "@playwright/test";
import { baseURL } from "./e2e/config";

export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: "html",
  retries: process.env.CI ? 2 : 0,
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  webServer: {
    command: process.env.CI ? "pnpm run preview" : "pnpm run dev",
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
  workers: process.env.CI ? 2 : undefined,
});
