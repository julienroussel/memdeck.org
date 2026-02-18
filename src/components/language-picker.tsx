import { NativeSelect } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  changeLanguage,
  isSupportedLanguage,
  LANGUAGE_CODES,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
} from "../i18n/language";
import { analytics } from "../services/analytics";

const LANGUAGE_OPTIONS = SUPPORTED_LANGUAGES.map((lang) => ({
  label: LANGUAGE_CODES[lang],
  value: lang,
}));

export const LanguagePicker = memo(function LanguagePicker() {
  const { t, i18n } = useTranslation();

  const currentLang = isSupportedLanguage(i18n.language) ? i18n.language : "en";

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      if (isSupportedLanguage(value)) {
        analytics.trackEvent("Settings", "Language Changed", value);
        changeLanguage(value).catch(() => {
          notifications.show({
            color: "red",
            message: t("errors.somethingWentWrong"),
          });
        });
      }
    },
    [t]
  );

  return (
    <NativeSelect
      aria-label={t("header.languageAriaLabel")}
      data={LANGUAGE_OPTIONS}
      data-testid="language-picker"
      onChange={handleChange}
      size="xs"
      title={LANGUAGE_LABELS[currentLang]}
      value={currentLang}
      w={60}
    />
  );
});
