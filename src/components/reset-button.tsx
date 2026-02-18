import { Button, Group, Modal, Space, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconRestore } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { analytics } from "../services/analytics";

export const resetApp = async () => {
  localStorage.clear();

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  } catch {
    // Service worker API may not be available
  }

  try {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
  } catch {
    // Cache API may not be available
  }

  window.location.reload();
};

export const ResetButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();

  const handleConfirm = async () => {
    analytics.trackEvent("Settings", "Reset App");
    close();
    await resetApp();
  };

  return (
    <>
      <Modal
        onClose={close}
        opened={opened}
        title={t("resetButton.modalTitle")}
      >
        <Text id="reset-modal-body">{t("resetButton.modalBody")}</Text>
        <Space h="lg" />
        <Group justify="flex-end">
          <Button onClick={close} variant="default">
            {t("resetButton.cancel")}
          </Button>
          <Button
            aria-describedby="reset-modal-body"
            color="red"
            onClick={handleConfirm}
          >
            {t("resetButton.confirm")}
          </Button>
        </Group>
      </Modal>

      <Button
        color="red"
        fullWidth
        leftSection={<IconRestore aria-hidden="true" size={16} />}
        mt="xs"
        onClick={open}
        size="compact-sm"
        variant="subtle"
      >
        {t("resetButton.label")}
      </Button>
    </>
  );
};
