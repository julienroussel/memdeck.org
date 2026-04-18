import { useRegisterSW } from "virtual:pwa-register/react";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  COMMIT_HASH_LSK,
  PWA_UPDATE_COOLDOWN_MS,
  PWA_UPDATE_TOAST_TIMEOUT,
  UPDATE_NOTIFIED_AT_LSK,
} from "../constants";
import { analytics } from "../services/analytics";

const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Silently auto-updates the service worker and shows a brief "Updated" toast
 * on the user's next visit when a new version has been applied.
 * At most one toast per 24 hours. Renders nothing.
 */
export const PwaUpdateNotifier = () => {
  const { t } = useTranslation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(
          () => registration.update(),
          UPDATE_INTERVAL_MS
        );
      }
    },
  });

  useEffect(
    () => () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const storedHash = localStorage.getItem(COMMIT_HASH_LSK);

    if (!storedHash) {
      localStorage.setItem(COMMIT_HASH_LSK, __COMMIT_HASH__);
      return;
    }

    if (storedHash === __COMMIT_HASH__) {
      return;
    }

    localStorage.setItem(COMMIT_HASH_LSK, __COMMIT_HASH__);

    const lastNotified = localStorage.getItem(UPDATE_NOTIFIED_AT_LSK);
    if (lastNotified) {
      const elapsed = Date.now() - Number(lastNotified);
      if (elapsed < PWA_UPDATE_COOLDOWN_MS) {
        return;
      }
    }

    localStorage.setItem(UPDATE_NOTIFIED_AT_LSK, String(Date.now()));
    analytics.trackFeatureUsed("PWA Update Applied");

    notifications.show({
      color: "teal",
      autoClose: PWA_UPDATE_TOAST_TIMEOUT,
      title: t("pwaUpdate.title"),
      message: t("pwaUpdate.message"),
      withCloseButton: true,
    });
  }, [t]);

  return null;
};
