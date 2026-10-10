import { useEffect } from "react";
import { ALL_CARDS } from "../types/playingcard";

// On a first visit the page is not controlled by the service worker (no
// `clientsClaim` with `injectRegister: false`), so a preload here would fetch
// every face from the network and the SW install would then fetch them all
// again for its precache. Leave that case to the precache. Preload when the
// page is SW-controlled (served from the precache) or when service workers are
// unavailable (the HTTP cache is then the only cache).
const shouldPreload = (): boolean => {
  try {
    // lib.dom types this as always present; it is absent outside secure contexts.
    const container: ServiceWorkerContainer | undefined =
      navigator.serviceWorker;
    return !container || container.controller !== null;
  } catch {
    // Same guard as reset-button.tsx: treat a throwing access as unsupported.
    return true;
  }
};

/**
 * Prefetches all 52 card SVG images in the background for instant display in
 * training modes, unless the service worker's precache install is about to
 * fetch them (see `shouldPreload`).
 */
export const useCardImagePreload = (): void => {
  useEffect(() => {
    if (!shouldPreload()) {
      return;
    }

    const preload = () => {
      for (const card of ALL_CARDS) {
        const img = new Image();
        img.src = card.image;
      }
    };

    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(preload);
      return () => cancelIdleCallback(id);
    }

    const id = setTimeout(preload, 1);
    return () => clearTimeout(id);
  }, []);
};
