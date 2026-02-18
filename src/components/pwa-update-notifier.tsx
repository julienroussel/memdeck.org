import { useRegisterSW } from "virtual:pwa-register/react";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { analytics } from "../services/analytics";

/**
 * Detects when a new service worker is ready and shows a Mantine notification
 * with a "Reload" button so the user can activate the update.
 * Renders nothing.
 */
export const PwaUpdateNotifier = () => {
  const { t } = useTranslation();
  const notifiedRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  useEffect(() => {
    if (needRefresh && !notifiedRef.current) {
      notifiedRef.current = true;
      analytics.trackFeatureUsed("PWA Update Available");

      const handleReload = () => {
        analytics.trackFeatureUsed("PWA Update Accepted");
        updateServiceWorker(true);
      };

      notifications.show({
        autoClose: false,
        color: "blue",
        title: t("pwaUpdate.title"),
        message: (
          <>
            {t("pwaUpdate.message")}{" "}
            <button
              onClick={handleReload}
              style={{
                all: "unset",
                display: "inline-block",
                cursor: "pointer",
                outline: "revert",
                textDecoration: "underline",
                padding: "8px 16px",
                minHeight: "44px",
              }}
              type="button"
            >
              {t("pwaUpdate.reload")}
            </button>
          </>
        ),
        withCloseButton: true,
      });
    }
  }, [needRefresh, t, updateServiceWorker]);

  return null;
};
