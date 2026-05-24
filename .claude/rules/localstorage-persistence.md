---
paths:
  - "src/hooks/use-all-time-stats*.ts"
  - "src/hooks/use-pwa-install.ts"
  - "src/hooks/use-selected-stack.ts"
  - "src/hooks/use-session*.ts"
  - "src/hooks/use-stack-limits.ts"
  - "src/hooks/use-timer-settings.ts"
  - "src/pages/**/use-*-settings.ts"
  - "src/utils/localstorage*.ts"
  - "src/utils/session-*.ts"
  - "src/utils/color-scheme-manager.ts"
  - "src/services/analytics.ts"
---

# localStorage Persistence

localStorage writes are not guaranteed — Safari ITP eviction, quota exhausted, private-browsing limits, and cross-tab races all cause silent failures. Every persisted-state hook in this codebase encodes assumptions earned from real incidents (#639, #643, #644, #647, #651, #652, #654, #669, #672, #673, #674). Follow the patterns below when extending or adding one.

## Don't call `localStorage.setItem` directly

Go through `useLocalDb` (`src/utils/localstorage.ts`). The hook reads via `useSyncExternalStore` so no mount-time writes can overwrite corrupt-but-recoverable state (#647), writes only when the consumer's setter runs, reports failures via `onWriteFailed`, and parses JSON with a prototype-stripping reviver. Storage keys live in `src/constants.ts` with the `_LSK` suffix — never inline a string literal (pattern locked in by #673's `COLOR_SCHEME_LSK` extraction). For non-localStorage persistence (color scheme), `src/utils/color-scheme-manager.ts` mirrors the same write-failure telemetry path.

## Wire telemetry through the canonical helpers

Pass `handleLocalDbWriteFailed` and `reportLocalDbCorruption` from `src/utils/localstorage-telemetry.ts` to every `useLocalDb` consumer. They scrub error messages — V8 leaks `JSON.parse` SyntaxError snippets into the GA exception description otherwise (see the comment inside `reportLocalDbCorruption` in `src/utils/localstorage-telemetry.ts` before refactoring it) — and route all write failures into a single GA exception taxonomy (`LocalDbWriteFailed` / `LocalDbPersistenceFailed`) so aggregations don't need substring filters (#669).

## Gate side-effects on `{ onSuccess }`

When the change being persisted is also analytics-tracked or event-bus-emitted, pass `{ onSuccess }` to the setter and run the emit inside it (#651, #674). Otherwise a swallowed quota-exceeded looks like a successful change to analytics. The pattern is already applied in `use-timer-settings.ts`, `use-acaan-settings.ts`, `use-spot-check-settings.ts`, and the distance/flashcard/spot-check page handlers — mirror it in any new persisted setting.

## Use `probeStoredValue` for recoverable state

`probeStoredValue` (`src/utils/localstorage.ts:42`) returns a discriminated `absent | valid | corrupt | read-error` result. Use it instead of `getStoredValue` when overwriting would destroy user-recoverable data (session history, all-time stats) so consumers refuse to silently overwrite a corrupt-but-readable blob (#647). `getStoredValue` is fine for low-stakes single values where reset-on-write is acceptable.

## sessionStorage sentinels for non-clearable breadcrumbs; last-known-valid cache for cross-tab corruption

When `removeItem` itself fails (quota exhausted), a breadcrumb can't be cleared and the notification loops on every mount. Use a sessionStorage sentinel — separate quota bucket — to suppress within-tab repeats (#652; see `LAST_SAVE_FAILED_SHOWN_SSK` for the canonical example). Separately, a cross-tab `storage` event delivering an unparseable blob must not roll the consumer's value back to default; cache the last-known-valid per key and prefer it on corrupt/read-error probes (#654).

## Test the write-failure path

When adding a new persisted-state hook, write at least one unit test that triggers the `onWriteFailed` path. Use `createGatedSetterMock` (the shared test helper added in #651) — it mirrors `probedSetValue`'s success-only callback semantics. The vitest coverage ratchets in `vitest.config.ts` only catch missing branch coverage in aggregate; the write-failure path is easy to leave unexercised. For E2E coverage of quota-exceeded, see `e2e/theme.e2e.ts` (added in `c00203c`) — it shims `window.localStorage.setItem` to throw `QuotaExceededError` and asserts the toast appears.

## Note on rule activation

Per the Claude Code docs, path-scoped rules trigger when Claude *reads* a matching file. If you're asking Claude to create a brand-new `src/hooks/use-foo.ts` from scratch (no prior read), this rule won't auto-attach — mention it explicitly or have Claude read an existing persisted-state hook (e.g., `use-stack-limits.ts`) first.
