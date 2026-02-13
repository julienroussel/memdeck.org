import { type ComponentType, type LazyExoticComponent, lazy } from "react";
import { CHUNK_RELOAD_SSK } from "../constants";

const CHUNK_RELOADED_PARAM = "chunk-reloaded";

const staleChunkPatterns = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
];

function isStaleChunkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    staleChunkPatterns.some((pattern) => error.message.includes(pattern))
  );
}

export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (!isStaleChunkError(error)) {
        throw error;
      }

      const key = `${CHUNK_RELOAD_SSK}${window.location.pathname}`;
      const params = new URLSearchParams(window.location.search);

      if (sessionStorage.getItem(key) || params.has(CHUNK_RELOADED_PARAM)) {
        throw error;
      }

      try {
        sessionStorage.setItem(key, "1");
      } catch {
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
