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
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";

const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    // Read failures (Safari ITP, private mode) are telemetry-only: surfacing
    // the "write failed" toast on a read error would mislead the user.
    reportLocalDbCorruption(key, error);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    handleLocalDbWriteFailed(key, error);
  }
};

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
        intervalRef.current = setInterval(() => {
          // `Promise.resolve` wraps so a non-Promise return (e.g. test mocks)
          // doesn't throw on `.catch`. Production browsers always return a
          // Promise per the ServiceWorkerRegistration spec.
          Promise.resolve(registration.update()).catch((error: unknown) => {
            const wrapped =
              error instanceof Error
                ? new Error(error.message, { cause: error })
                : new Error("unknown", { cause: error });
            wrapped.name = "PwaUpdateCheckFailed";
            analytics.trackError(wrapped);
          });
        }, UPDATE_INTERVAL_MS);
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
    const storedHash = safeGetItem(COMMIT_HASH_LSK);

    if (!storedHash) {
      safeSetItem(COMMIT_HASH_LSK, __COMMIT_HASH__);
      return;
    }

    if (storedHash === __COMMIT_HASH__) {
      return;
    }

    safeSetItem(COMMIT_HASH_LSK, __COMMIT_HASH__);

    const lastNotified = safeGetItem(UPDATE_NOTIFIED_AT_LSK);
    if (lastNotified) {
      const elapsed = Date.now() - Number(lastNotified);
      if (elapsed < PWA_UPDATE_COOLDOWN_MS) {
        return;
      }
    }

    safeSetItem(UPDATE_NOTIFIED_AT_LSK, String(Date.now()));
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
