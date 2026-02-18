import { Accordion, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TOOLBOX_SECTIONS_LSK } from "../../constants";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { analytics } from "../../services/analytics";
import { useLocalDb } from "../../utils/localstorage";
import { CardSpelling } from "./card-spelling";
import { FaroShuffle } from "./faro-shuffle";
import { StackLookup } from "./stack-lookup";

export const Toolbox = () => {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useLocalDb<string[]>(
    TOOLBOX_SECTIONS_LSK,
    []
  );

  const handleSectionsChange = (sections: string[]) => {
    const opened = sections.filter((s) => !openSections.includes(s));
    for (const section of opened) {
      analytics.trackFeatureUsed(`Toolbox - ${section}`);
    }
    setOpenSections(sections);
  };

  useDocumentMeta({
    title: t("toolbox.pageTitle"),
    description: t("toolbox.pageDescription"),
  });

  return (
    <Stack gap="xl" p="md">
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
      </Accordion>
    </Stack>
  );
};
