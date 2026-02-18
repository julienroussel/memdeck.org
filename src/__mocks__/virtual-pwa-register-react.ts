import { useState } from "react";
import type { RegisterSWOptions } from "vite-plugin-pwa/types";

/**
 * No-op stub for vite-plugin-pwa's virtual module.
 * Tests override this via vi.mock("virtual:pwa-register/react").
 */
export const useRegisterSW = (_options?: RegisterSWOptions) => ({
  needRefresh: useState(false),
  offlineReady: useState(false),
  updateServiceWorker: (_reloadPage?: boolean): Promise<void> =>
    Promise.resolve(),
});
