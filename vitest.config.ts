import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify("test"),
  },
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
    coverage: {
      include: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.test.{ts,tsx}",
        "!src/types/suits/**",
        "!src/main.tsx",
        "!src/vite-env.d.ts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      thresholds: {
        branches: 40,
        functions: 40,
        // Global thresholds - UI components lower overall coverage
        lines: 55,
        // Per-glob thresholds — set just below current values as a ratchet.
        // Raise them as coverage improves; never lower without justification.
        "src/hooks/**/*.ts": {
          branches: 60,
          functions: 90,
          lines: 85,
          statements: 85,
        },
        "src/services/**/*.ts": {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "src/types/*.ts": {
          branches: 70,
          functions: 80,
          lines: 85,
          statements: 85,
        },
        "src/utils/**/*.ts": {
          branches: 70,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        statements: 55,
      },
    },
    environment: "happy-dom",
    exclude: ["node_modules", "dist"],
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
