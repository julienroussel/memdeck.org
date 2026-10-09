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
        branches: 87,
        functions: 86,
        // Global thresholds - UI components lower overall coverage
        lines: 91,
        // Ratchet rule, global and per-glob: each threshold is the largest
        // integer strictly below the measured value (measured 2026-10-02), so
        // 97.4 gives 97 and 100 gives 99. A glob is checked against the
        // aggregate of its matching files (perFile is off), not per file.
        // Raise them as coverage improves; never lower without justification.
        "src/components/**/use-*.ts": {
          branches: 97,
          functions: 99,
          lines: 98,
          statements: 98,
        },
        "src/hooks/**/*.ts": {
          branches: 92,
          functions: 99,
          lines: 97,
          statements: 97,
        },
        "src/i18n/*.ts": {
          branches: 82,
          functions: 99,
          lines: 92,
          statements: 92,
        },
        "src/pages/**/*.ts": {
          branches: 93,
          functions: 98,
          lines: 96,
          statements: 96,
        },
        "src/services/**/*.ts": {
          branches: 91,
          functions: 99,
          lines: 97,
          statements: 98,
        },
        "src/types/*.ts": {
          branches: 98,
          functions: 99,
          lines: 98,
          statements: 98,
        },
        "src/utils/**/*.ts": {
          branches: 92,
          functions: 98,
          lines: 97,
          statements: 97,
        },
        statements: 90,
      },
    },
    environment: "happy-dom",
    exclude: ["node_modules", "dist"],
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    // Set explicitly to reject Vitest's `isolate: false` performance hint, and
    // to suppress it (hints are not printed for options set explicitly).
    // Measured 2026-09-07, `vitest run`, median of 3 warm runs:
    //   threads + isolate      12.6s   128/128 pass
    //   vmThreads               4.6s   6 tests fail in 3 files
    //   threads + no-isolate    2.3s   2-8 files fail, a DIFFERENT set each run
    // `isolate: false` shares the module registry and globals across files in a
    // worker, and this suite leans on `vi.mock` (45 files) and `vi.stubGlobal`
    // (11 files); the resulting failures are non-deterministic even on a single
    // sequential worker, so they would land in CI as flakes, not as a bounded
    // fix. Worth re-testing on a future Vitest bump: 5.0.0 landed here one
    // commit ago, and the shared-registry mocking behaviour may change.
    // `vmThreads` keeps per-file isolation and is genuinely faster, but its VM
    // realm has its own `Error`, so happy-dom's `DOMException` is not
    // `instanceof Error` inside it. `src/` has 18 `instanceof Error` guards
    // (localstorage-telemetry, session-breadcrumbs, provider, error-boundary,
    // analytics...) that silently take the wrong branch under it; only 6 tests
    // were watching. That is a test-fidelity loss, not 6 tests to fix.
    isolate: true,
    // Worker threads instead of the default child-process forks: measured
    // ~13% faster on the full suite (12.4s -> 10.8s locally) with the same
    // per-file isolation. Nothing here needs process-level isolation.
    pool: "threads",
    setupFiles: ["./vitest.setup.ts"],
  },
});
