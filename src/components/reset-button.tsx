import { ActionIcon, Button, Modal, Stack, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconRestore } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ALL_TIME_STATS_LSK, SESSION_HISTORY_LSK } from "../constants";
import { analytics } from "../services/analytics";

const STATS_KEYS = [SESSION_HISTORY_LSK, ALL_TIME_STATS_LSK];

const clearServiceWorkersAndCaches = async () => {
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
};

export const resetSettings = async () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !STATS_KEYS.includes(key)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage may throw SecurityError in private browsing
  }

  await clearServiceWorkersAndCaches();
  window.location.reload();
};

export const resetApp = async () => {
  try {
    localStorage.clear();
  } catch {
    // localStorage may throw SecurityError in private browsing
  }

  await clearServiceWorkersAndCaches();
  window.location.reload();
};

export const ResetButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();

  const handleResetSettings = async () => {
    analytics.trackEvent("Settings", "Reset Settings");
    close();
    await resetSettings();
  };

  const handleResetAll = async () => {
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
        <Text>{t("resetButton.modalBody")}</Text>
        <Stack gap="sm" mt="lg">
          <div>
            <Button
              aria-describedby="reset-settings-desc"
              color="orange"
              fullWidth
              onClick={handleResetSettings}
            >
              {t("resetButton.resetSettings")}
            </Button>
            <Text c="dimmed" id="reset-settings-desc" mt={4} size="xs">
              {t("resetButton.resetSettingsDescription")}
            </Text>
          </div>
          <div>
            <Button
              aria-describedby="reset-all-desc"
              color="red"
              fullWidth
              onClick={handleResetAll}
            >
              {t("resetButton.confirmFull")}
            </Button>
            <Text c="dimmed" id="reset-all-desc" mt={4} size="xs">
              {t("resetButton.fullResetDescription")}
            </Text>
          </div>
          <Button fullWidth onClick={close} variant="default">
            {t("resetButton.cancel")}
          </Button>
        </Stack>
      </Modal>

      <Tooltip label={t("resetButton.label")}>
        <ActionIcon
          aria-label={t("resetButton.label")}
          color="red"
          onClick={open}
          variant="subtle"
        >
          <IconRestore aria-hidden="true" size={16} />
        </ActionIcon>
      </Tooltip>
    </>
  );
};
