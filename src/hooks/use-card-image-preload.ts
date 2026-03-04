import { useEffect } from "react";
import { ALL_CARDS } from "../types/playingcard";

/**
 * Prefetches all 52 card SVG images in the background so they are cached
 * by the service worker for instant display in training modes.
 */
export const useCardImagePreload = () => {
  useEffect(() => {
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
