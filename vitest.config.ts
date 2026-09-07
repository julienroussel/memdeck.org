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
