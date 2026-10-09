import { type ComponentType, type LazyExoticComponent, lazy } from "react";
import { CHUNK_RELOAD_SSK } from "../constants";
import { analytics } from "../services/analytics";
import { isStaleChunkError } from "./stale-chunk";

const CHUNK_RELOADED_PARAM = "chunk-reloaded";

// A successful load ends the recovery, so clear its guard: left in place, it
// would turn the next stale-chunk error on this path (a later deploy in a
// long-lived tab or PWA window) into the error page instead of a reload.
function clearReloadGuard<M>(module: M): M {
  try {
    sessionStorage.removeItem(`${CHUNK_RELOAD_SSK}${window.location.pathname}`);
  } catch {
    // sessionStorage unavailable: the URL-param guard below applies instead
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has(CHUNK_RELOADED_PARAM)) {
    params.delete(CHUNK_RELOADED_PARAM);
    const query = params.toString();
    const search = query ? `?${query}` : "";
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${search}${window.location.hash}`
    );
  }

  return module;
}

export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().then(clearReloadGuard, (error: unknown) => {
      if (!isStaleChunkError(error)) {
        throw error;
      }

      const key = `${CHUNK_RELOAD_SSK}${window.location.pathname}`;
      const params = new URLSearchParams(window.location.search);

      let hasReloadSentinel = false;
      try {
        hasReloadSentinel = sessionStorage.getItem(key) !== null;
      } catch {
        // Accessing sessionStorage itself can throw (SecurityError when
        // storage is disabled). Treat as "no sentinel present" — the setItem
        // below fails the same way and falls back to the URL-param guard.
      }

      if (hasReloadSentinel || params.has(CHUNK_RELOADED_PARAM)) {
        throw error;
      }

      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // sessionStorage write failed (quota / disabled / private browsing) —
        // fall back to a URL-param guard so we still avoid an infinite reload
        // loop. Report once so the rate of this fallback path is observable
        // in GA. Wrapped in its own try/catch because telemetry MUST NOT
        // break recovery.
        try {
          const wrapped = new Error("sessionStorage unavailable");
          wrapped.name = "StaleChunkReloadGuardFallback";
          analytics.trackError(wrapped);
        } catch {
          // never let telemetry break the recovery
        }
        params.set(CHUNK_RELOADED_PARAM, "1");
        window.location.search = params.toString();

        return new Promise<never>(() => {
          // Keep Suspense spinner visible while the browser navigates
        });
      }
      window.location.reload();

      return new Promise<never>(() => {
        // Keep Suspense spinner visible while the page reloads
      });
    })
  );
}
