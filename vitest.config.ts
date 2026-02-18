import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // vite-plugin-pwa's virtual module is unavailable during tests.
      // Point it at a no-op stub so vi.mock() in test files can intercept it.
      "virtual:pwa-register/react": new URL(
        "src/__mocks__/virtual-pwa-register-react.ts",
        import.meta.url
      ).pathname,
    },
  },
  test: {
    globals: false,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.test.{ts,tsx}",
        "!src/types/suits/**",
        "!src/main.tsx",
        "!src/vite-env.d.ts",
      ],
      thresholds: {
        // Global thresholds - UI components lower overall coverage
        lines: 45,
        functions: 25,
        branches: 30,
        statements: 45,
        // Per-glob thresholds — set just below current values as a ratchet.
        // Raise them as coverage improves; never lower without justification.
        "src/hooks/**/*.ts": {
          lines: 85,
          functions: 90,
          branches: 60,
          statements: 85,
        },
        "src/utils/**/*.ts": {
          lines: 90,
          functions: 90,
          branches: 70,
          statements: 90,
        },
        "src/types/*.ts": {
          lines: 85,
          functions: 80,
          branches: 70,
          statements: 85,
        },
      },
    },
  },
});
