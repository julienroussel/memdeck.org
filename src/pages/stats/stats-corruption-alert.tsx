import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export const StatsCorruptionAlert = () => {
  const { t } = useTranslation();
  return (
    <Alert
      color="red"
      icon={<IconAlertCircle aria-hidden="true" />}
      role="alert"
      title={t("errors.sessionHistoryCorrupt.title")}
    >
      {t("errors.sessionHistoryCorrupt.message")}
    </Alert>
  );
};
