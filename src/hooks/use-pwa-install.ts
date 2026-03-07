import { useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PWA_INSTALL_COOLDOWN_MS,
  PWA_INSTALL_DISMISSED_AT_LSK,
  PWA_INSTALL_PERMANENTLY_DISMISSED_LSK,
  SESSION_HISTORY_LSK,
} from "../constants";
import { isPwa } from "../utils/is-pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

const hasCompletedSession = (): boolean => {
  const raw = localStorage.getItem(SESSION_HISTORY_LSK);
  if (!raw) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
};

const isDismissedWithinCooldown = (): boolean => {
  const dismissedAt = localStorage.getItem(PWA_INSTALL_DISMISSED_AT_LSK);
  if (!dismissedAt) {
    return false;
  }
  return Date.now() - Number(dismissedAt) < PWA_INSTALL_COOLDOWN_MS;
};

const isPermanentlyDismissed = (): boolean =>
  localStorage.getItem(PWA_INSTALL_PERMANENTLY_DISMISSED_LSK) === "true";

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
    if (runningAsPwa || !isMobile) {
      return;
    }
    if (!hasCompletedSession()) {
      return;
    }
    if (isPermanentlyDismissed()) {
      return;
    }
    if (isDismissedWithinCooldown()) {
      return;
    }
    setEligible(true);
  }, [runningAsPwa, isMobile]);

  const install = useCallback((): boolean => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      deferredPromptRef.current = null;
      setEligible(false);
      return true;
    }
    return false;
  }, []);

  const dismiss = useCallback(() => {
    const wasDismissedBefore = localStorage.getItem(
      PWA_INSTALL_DISMISSED_AT_LSK
    );
    if (wasDismissedBefore) {
      localStorage.setItem(PWA_INSTALL_PERMANENTLY_DISMISSED_LSK, "true");
    }
    localStorage.setItem(PWA_INSTALL_DISMISSED_AT_LSK, String(Date.now()));
    setEligible(false);
  }, []);

  return { eligible, install, dismiss };
};
