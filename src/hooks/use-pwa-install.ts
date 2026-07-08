import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PWA_INSTALL_COOLDOWN_MS,
  PWA_INSTALL_DISMISSED_AT_LSK,
  PWA_INSTALL_PERMANENTLY_DISMISSED_LSK,
  SESSION_HISTORY_LSK,
} from "../constants";
import { analytics } from "../services/analytics";
import { isPwa } from "../utils/is-pwa";
import { getStoredValue, useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value);

const hasCompletedSession = (): boolean => {
  const history = getStoredValue<unknown[]>(
    SESSION_HISTORY_LSK,
    [],
    isUnknownArray
  );
  return history.length > 0;
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

type UsePwaInstallResult = {
  eligible: boolean;
  install: () => boolean;
  dismiss: () => void;
};

export const usePwaInstall = (): UsePwaInstallResult => {
  const runningAsPwa = isPwa();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [eligible, setEligible] = useState(false);

  const [dismissedAt, setDismissedAt] = useLocalDb<number | null>(
    PWA_INSTALL_DISMISSED_AT_LSK,
    null,
    (value): value is number | null => value === null || isNumber(value),
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  const [permanentlyDismissed, setPermanentlyDismissed] = useLocalDb<boolean>(
    PWA_INSTALL_PERMANENTLY_DISMISSED_LSK,
    false,
    isBoolean,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      // Browser event type lacks the prompt() method; cast at system boundary
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const cooldownActive =
      dismissedAt !== null &&
      Date.now() - dismissedAt < PWA_INSTALL_COOLDOWN_MS;
    const isEligible =
      !runningAsPwa &&
      isMobile === true &&
      hasCompletedSession() &&
      !permanentlyDismissed &&
      !cooldownActive;
    setEligible(isEligible);
  }, [runningAsPwa, isMobile, permanentlyDismissed, dismissedAt]);

  const install = useCallback((): boolean => {
    const event = deferredPromptRef.current;
    if (!event) {
      return false;
    }
    deferredPromptRef.current = null;
    setEligible(false);
    // Handle rejection without changing the sync return signature: emit
    // telemetry once and leave the ref empty — prompt() may only be called
    // once per BeforeInstallPromptEvent, so restoring the consumed event
    // would make every retry reject again. A fresh beforeinstallprompt
    // event (captured by the listener above) re-enables the native flow.
    // The returned promise from prompt() is intentionally fire-and-forget
    // after the catch handler — callers only care whether the native flow
    // was *initiated* synchronously.
    event.prompt().catch((error: unknown) => {
      const wrapped =
        error instanceof Error
          ? new Error(error.message, { cause: error })
          : new Error("unknown", { cause: error });
      wrapped.name = "PwaInstallPromptRejected";
      analytics.trackError(wrapped);
    });
    return true;
  }, []);

  const dismiss = useCallback(() => {
    const wasDismissedBefore = dismissedAt !== null;
    if (wasDismissedBefore) {
      setPermanentlyDismissed(true);
    }
    setDismissedAt(Date.now());
    setEligible(false);
  }, [dismissedAt, setDismissedAt, setPermanentlyDismissed]);

  return { dismiss, eligible, install };
};
