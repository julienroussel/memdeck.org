import { Affix, Button, Group, Paper, Text } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ANALYTICS_CONSENT_LSK } from "../constants";
import { analytics, isAnalyticsHost } from "../services/analytics";
import { useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";

type AnalyticsConsentChoice = "granted" | "denied" | null;

const isConsentChoice = (value: unknown): value is AnalyticsConsentChoice =>
  value === null || value === "granted" || value === "denied";

const scheduleInitialize = () => {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => analytics.initialize());
  } else {
    setTimeout(() => analytics.initialize(), 1);
  }
};

export const AnalyticsConsent = () => {
  const { t } = useTranslation();
  const [consent, setConsent] = useLocalDb<AnalyticsConsentChoice>(
    ANALYTICS_CONSENT_LSK,
    null,
    isConsentChoice,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );
  const initializedRef = useRef(false);

  useEffect(() => {
    if (consent !== "granted" || initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    scheduleInitialize();
  }, [consent]);

  const handleAccept = useCallback(() => {
    setConsent("granted");
  }, [setConsent]);

  const handleDecline = useCallback(() => {
    setConsent("denied");
  }, [setConsent]);

  if (consent !== null || !isAnalyticsHost()) {
    return null;
  }

  return (
    <Affix position={{ bottom: 16, left: 16, right: 16 }} zIndex={300}>
      <Paper maw={480} mx="auto" p="sm" radius="md" shadow="md" withBorder>
        <Text size="sm">{t("analyticsConsent.message")}</Text>
        <Group gap="xs" justify="flex-end" mt="sm">
          <Button onClick={handleDecline} size="xs" variant="default">
            {t("analyticsConsent.decline")}
          </Button>
          <Button onClick={handleAccept} size="xs">
            {t("analyticsConsent.accept")}
          </Button>
        </Group>
      </Paper>
    </Affix>
  );
};
