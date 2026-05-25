---
paths:
  - "vite.config.ts"
  - "src/routes.tsx"
  - "src/utils/lazy-with-reload.ts"
  - "src/utils/stale-chunk.ts"
  - "src/i18n/language.ts"
  - "src/i18n/index.ts"
---

# PWA & Lazy Loading

The PWA + SPA + locale-chunk combination has several easy-to-break, hard-to-test edges. The patterns below have prevented or recovered from real incidents (#412, #413, #500, #513, #519, #521, #527, #537, #582, #646).

## Use `lazyWithReload`, never bare `React.lazy()`

Route-level code splitting goes through `lazyWithReload` (`src/utils/lazy-with-reload.ts`), not React's bare `lazy()`. The wrapper catches stale-chunk 404s — old PWA shells fetching chunk hashes that no longer exist after deploy — guards against reload loops with a sessionStorage sentinel (falling back to a `chunk-reloaded` URL param if sessionStorage is unavailable), and calls `window.location.reload()` (#527, #537). It does NOT update the service worker — the route path relies on `registerType: "autoUpdate"` having the new SW ready. Without `lazyWithReload`, post-deploy navigation produces blank pages and 500s. The shared 404 detector is `isStaleChunkError` in `src/utils/stale-chunk.ts`.

## Locale switching uses `changeLanguage()`, not raw `import()`

`changeLanguage()` in `src/i18n/language.ts` is the only safe entry point for switching languages — its `reloadOnStaleChunk` helper reuses `isStaleChunkError` to recover from cross-tab locale-chunk 404s after deploy AND calls `updateServiceWorker()` (uses `navigator.serviceWorker.getRegistration()` + Workbox's `SKIP_WAITING` message convention) before reloading, because a stale locale chunk usually means the active SW is also stale (#527). Never call `i18next.changeLanguage()` directly or dynamic-import a locale JSON ad-hoc; both bypass the recovery and break for users with old PWA shells in a fresh tab.

## PWA manifest shortcuts must reference `ROUTES`

The router 301-redirects no-trailing-slash → trailing-slash, and a PWA launch that hits the 301 breaks the install context (#582 was a 51-file fix from this exact mismatch). `ROUTES` in `src/constants.ts` is type-enforced to end with `/` via `satisfies Record<string, RoutePath>`. The manifest shortcuts in `vite.config.ts` are kept in sync via `PWA_SHORTCUTS` (also in `src/constants.ts`); `src/pwa-shortcuts.test.ts` fails if a shortcut URL drifts from `ROUTES`. Add new shortcuts to `PWA_SHORTCUTS`, not inline in `vite.config.ts`.

## When touching the vite PWA block, rebuild

If you change `manifest`, `globIgnores`, `registerType`, `manualChunks`, or `runtimeCaching`, add `pnpm run build` to your Definition of Done and visually verify:

- `dist/sw.js` exists and is non-empty
- `dist/assets/locale-<code>-<hash>.js` chunks exist for every locale
- The PWA manifest is referenced from `dist/index.html`
- New locale chunks are listed under `globIgnores` (otherwise precache bloats with 7 locales × N KB)

This is the only end-to-end check; the build is the source of truth, not source-level reasoning.

## `manualChunks` is load-bearing for caching

The vendor chunks (`react-vendor`, `mantine-vendor`, `icons-vendor`, `analytics-vendor`, `i18n-vendor`) give predictable HTTP cache survival across deploys. Locale chunks are named `locale-<code>` so `globIgnores: ["assets/locale-*.js", "splash/*.png"]` works as a single pattern. Don't rename, flatten, or merge — every refactor here should preserve the cache surfaces.

## `registerType: "autoUpdate"` is intentional

Updates are silent with a subtle toast (#513). The previous "prompt user to update" flow was annoying for a single-dev SPA. Don't flip back without strong justification.

## Lighthouse CI is the perf budget

`lighthouserc.json` enforces 0.9 (warn) for performance, 0.9 (error) for accessibility / best-practices / SEO. Run `pnpm run lighthouse` locally before merging if you're about to lazy-load heavy work in a route. The audit set was trimmed from 27 URLs → 3 representative ones in #521 — don't restore the bloated set; static SPAs have negligible variance.

## New lazy-loaded heavy modules

Wrap in `lazyWithReload`, give them a `<Suspense>` boundary with `PageLoader` (or an inline fallback), and verify the chunk appears under `dist/assets/`. There is no per-route bundle-size budget — Lighthouse CI is the only enforced check, so plan ahead before lazy-loading anything heavy.

## `useCardImagePreload` belongs on every training route entry

The 52 card SVGs are idle-time prefetched by `useCardImagePreload` (`src/hooks/use-card-image-preload.ts`). PWA shortcuts launch directly into training routes (Flashcard, Spot Check, ACAAN, Distance, Toolbox) and skip `Home`, so the prefetch must be invoked from each training page entry — not only from `Home`. Pattern: call `useCardImagePreload()` near the top of the component, right after `useDocumentMeta(...)`. The hook is idempotent and idle-scheduled, so additional call sites are safe. Verified across all 5 training pages today; preserve this when adding a new training mode.
