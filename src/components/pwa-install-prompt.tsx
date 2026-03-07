import { List, Modal } from "@mantine/core";
import { useTranslation } from "react-i18next";

const IOS_PATTERN = /iPhone|iPad|iPod/;

const isIos = (): boolean =>
  IOS_PATTERN.test(navigator.userAgent) && !("MSStream" in window);

type PwaInstallPromptProps = {
  opened: boolean;
  onClose: () => void;
};

export const PwaInstallPrompt = ({
  opened,
  onClose,
}: PwaInstallPromptProps) => {
  const { t } = useTranslation();
  const ios = isIos();

  return (
    <Modal
      centered
      onClose={onClose}
      opened={opened}
      title={t("pwaInstall.modalTitle")}
    >
      <List spacing="sm" type="ordered">
        {ios ? (
          <>
            <List.Item>{t("pwaInstall.iosStep1")}</List.Item>
            <List.Item>{t("pwaInstall.iosStep2")}</List.Item>
            <List.Item>{t("pwaInstall.iosStep3")}</List.Item>
          </>
        ) : (
          <>
            <List.Item>{t("pwaInstall.androidStep1")}</List.Item>
            <List.Item>{t("pwaInstall.androidStep2")}</List.Item>
            <List.Item>{t("pwaInstall.androidStep3")}</List.Item>
          </>
        )}
      </List>
    </Modal>
  );
};
