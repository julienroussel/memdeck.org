import { notifications } from "@mantine/notifications";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { languageReady } from "../i18n";

/**
 * Awaits the initial language bundle load and shows a Mantine notification
 * if it failed, informing the user that English is being used as a fallback.
 * Renders nothing.
 */
export const LanguageLoadNotifier = () => {
  const { i18n } = useTranslation();
  const notifiedRef = useRef(false);

  useEffect(() => {
    languageReady.catch(() => {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        notifications.show({
          color: "orange",
          message: i18n.t("errors.languageLoadFailed"),
        });
      }
    });
  }, [i18n]);

  return null;
};
