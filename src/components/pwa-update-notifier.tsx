import { useRegisterSW } from "virtual:pwa-register/react";
import { Anchor } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  COMMIT_HASH_LSK,
  ROUTES,
  WHATS_NEW_LAST_ANNOUNCED_LSK,
} from "../constants";
import { WHATS_NEW_ENTRIES } from "../data/whats-new";
import { analytics } from "../services/analytics";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";

const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Fixed notification id so the in-message link can dismiss the toast it lives in. */
const PWA_UPDATE_TOAST_ID = "pwa-update";

const dismissPwaUpdateToast = () => notifications.hide(PWA_UPDATE_TOAST_ID);

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
 * Silently auto-updates the service worker. On the user's next visit after a new
 * version is applied, shows a brief "Updated" toast — but only when there's a
 * genuinely new, unannounced What's New entry to point at (silent on
 * dependency-bump / noise deploys). At most once per entry. Renders nothing.
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
    const latestEntryId = WHATS_NEW_ENTRIES[0]?.id;
    const storedHash = safeGetItem(COMMIT_HASH_LSK);

    if (!storedHash) {
      safeSetItem(COMMIT_HASH_LSK, __COMMIT_HASH__);
      // Seed the announced marker so brand-new users aren't toasted on their
      // next update for an entry that predates their first visit.
      if (latestEntryId) {
        safeSetItem(WHATS_NEW_LAST_ANNOUNCED_LSK, latestEntryId);
      }
      return;
    }

    if (storedHash === __COMMIT_HASH__) {
      return;
    }

    safeSetItem(COMMIT_HASH_LSK, __COMMIT_HASH__);

    // Telemetry stays above the What's New gate: every applied update is
    // tracked, even when the toast stays silent because nothing new shipped.
    analytics.trackFeatureUsed("PWA Update Applied");

    // Gate the toast on a genuinely new, unannounced changelog entry. Silent on
    // dependency-bump / noise deploys that ship no What's New entry.
    const lastAnnounced = safeGetItem(WHATS_NEW_LAST_ANNOUNCED_LSK);
    if (!latestEntryId || latestEntryId === lastAnnounced) {
      return;
    }

    safeSetItem(WHATS_NEW_LAST_ANNOUNCED_LSK, latestEntryId);

    notifications.show({
      // Persistent (WCAG 2.2.1): the toast holds a link keyboard/SR users may
      // not reach within an auto-close window; the close button dismisses it.
      autoClose: false,
      color: "teal",
      id: PWA_UPDATE_TOAST_ID,
      message: (
        <>
          {t("pwaUpdate.message")}{" "}
          <Anchor
            component={Link}
            onClick={dismissPwaUpdateToast}
            to={ROUTES.whatsNew}
          >
            {t("pwaUpdate.seeWhatsNew")}
          </Anchor>
        </>
      ),
      title: t("pwaUpdate.title"),
      withCloseButton: true,
    });
  }, [t]);

  return null;
};
