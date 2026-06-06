import { Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildBreadcrumbSchema, JsonLd } from "../../components/json-ld";
import { ROUTES } from "../../constants";
import { WHATS_NEW_ENTRIES } from "../../data/whats-new";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { isSupportedLanguage } from "../../i18n/language";
import { WhatsNewEntryCard } from "./whats-new-entry-card";

export const WhatsNew = () => {
  const { t, i18n } = useTranslation();
  const lang = isSupportedLanguage(i18n.language) ? i18n.language : "en";

  useDocumentMeta({
    title: t("whatsNew.pageTitle"),
    description: t("whatsNew.pageDescription"),
  });

  const breadcrumbSchema = useMemo(
    () => buildBreadcrumbSchema(t("whatsNew.title"), ROUTES.whatsNew),
    [t]
  );

  return (
    <article>
      <JsonLd data={breadcrumbSchema} />
      <Title mb="xs" order={1}>
        {t("whatsNew.title")}
      </Title>
      <Text c="dimmed" mb="xl">
        {t("whatsNew.intro")}
      </Text>
      <Stack gap="md">
        {WHATS_NEW_ENTRIES.map((entry) => (
          <WhatsNewEntryCard entry={entry} key={entry.id} lang={lang} />
        ))}
      </Stack>
    </article>
  );
};
