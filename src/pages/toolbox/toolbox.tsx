import { Accordion, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TOOLBOX_SECTIONS_LSK } from "../../constants";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { useLocalDb } from "../../utils/localstorage";
import { StackLookup } from "./stack-lookup";

export const Toolbox = () => {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useLocalDb<string[]>(
    TOOLBOX_SECTIONS_LSK,
    []
  );

  useDocumentMeta({
    title: t("toolbox.pageTitle"),
    description: t("toolbox.pageDescription"),
  });

  return (
    <Stack gap="xl" p="md">
      <Title order={1}>{t("toolbox.title")}</Title>
      <Accordion
        multiple
        onChange={setOpenSections}
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
      </Accordion>
    </Stack>
  );
};
