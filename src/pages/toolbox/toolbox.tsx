import { Accordion, Group, Stack, Text, Title } from "@mantine/core";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { buildBreadcrumbSchema, JsonLd } from "../../components/json-ld";
import { ROUTES, TOOLBOX_SECTIONS_LSK } from "../../constants";
import { useCardImagePreload } from "../../hooks/use-card-image-preload";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { analytics } from "../../services/analytics";
import { useLocalDb } from "../../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../../utils/localstorage-telemetry";
import { CardSpelling } from "./card-spelling";
import { FaroShuffle } from "./faro-shuffle";
import { StackLookup } from "./stack-lookup";
import { StayStack } from "./stay-stack";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

const breadcrumbSchema = buildBreadcrumbSchema("Toolbox", ROUTES.toolbox);

export const Toolbox = () => {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useLocalDb<string[]>(
    TOOLBOX_SECTIONS_LSK,
    [],
    isStringArray,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  const openSectionsRef = useRef(openSections);
  openSectionsRef.current = openSections;

  const handleSectionsChange = useCallback(
    (sections: string[]) => {
      const opened = sections.filter(
        (s) => !openSectionsRef.current.includes(s)
      );
      setOpenSections(sections, {
        // Gate analytics on a real persisted write so quota / ITP failures
        // don't inflate "Toolbox - X" feature-used counts. Mirrors the
        // pattern used in useStackLimits for STACK_LIMITS_CHANGED.
        onSuccess: () => {
          for (const section of opened) {
            analytics.trackFeatureUsed(`Toolbox - ${section}`);
          }
        },
      });
    },
    [setOpenSections]
  );

  useDocumentMeta({
    title: t("toolbox.pageTitle"),
    description: t("toolbox.pageDescription"),
  });
  useCardImagePreload();

  return (
    <Stack gap="xl" p="md">
      <JsonLd data={breadcrumbSchema} />
      <Title order={1}>{t("toolbox.title")}</Title>
      <Accordion
        multiple
        onChange={handleSectionsChange}
        value={openSections}
        variant="separated"
      >
        <Accordion.Item value="lookup">
          <Accordion.Control>
            <Group gap="sm" wrap="wrap">
              <Text fw={500}>{t("toolbox.lookup.title")}</Text>
              <Text c="dimmed" size="sm">
                {t("toolbox.lookup.description")}
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <StackLookup />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="faro">
          <Accordion.Control>
            <Group gap="sm" wrap="wrap">
              <Text fw={500}>{t("toolbox.faro.title")}</Text>
              <Text c="dimmed" size="sm">
                {t("toolbox.faro.description")}
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <FaroShuffle />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="spelling">
          <Accordion.Control>
            <Group gap="sm" wrap="wrap">
              <Text fw={500}>{t("toolbox.spelling.title")}</Text>
              <Text c="dimmed" size="sm">
                {t("toolbox.spelling.description")}
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <CardSpelling />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="sequences">
          <Accordion.Control>
            <Group gap="sm" wrap="wrap">
              <Text fw={500}>{t("toolbox.sequences.title")}</Text>
              <Text c="dimmed" size="sm">
                {t("toolbox.sequences.description")}
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <StayStack />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
