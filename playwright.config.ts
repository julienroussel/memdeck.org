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
    // Without a terminal, pnpm 12.6+ runs the script in its own process group
    // (pnpm/pnpm#15119), so the default SIGKILL leaves vite running and the
    // test run never exits. SIGTERM is relayed by pnpm to that group.
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
  workers: process.env.CI ? 2 : undefined,
});
