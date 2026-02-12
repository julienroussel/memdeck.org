import { type ComponentType, type LazyExoticComponent, lazy } from "react";
import { CHUNK_RELOAD_SSK } from "../constants";

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

      if (sessionStorage.getItem(key)) {
        throw error;
      }

      sessionStorage.setItem(key, "1");
      window.location.reload();

      return new Promise<never>(() => {
        // Keep Suspense spinner visible while the page reloads
      });
    })
  );
}
