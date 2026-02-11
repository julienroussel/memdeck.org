import { ActionIcon, Anchor, Modal, Space, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHelp } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { GITHUB_URL } from "../constants";

export const Help = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const { t } = useTranslation();

  return (
    <>
      <Modal
        onClose={close}
        opened={opened}
        size="auto"
        withCloseButton={false}
      >
        <Title order={1}>{t("help.title")}</Title>
        <Space h="lg" />
        <Text>{t("help.description")}</Text>
        <Space h="lg" />
        <Text>
          <Trans
            components={{
              githubLink: (
                <Anchor
                  href={GITHUB_URL}
                  rel="noopener"
                  target="_blank"
                  underline="never"
                />
              ),
            }}
            i18nKey="help.githubCta"
          />
        </Text>
      </Modal>

      <ActionIcon
        aria-label={t("header.helpAriaLabel")}
        color="gray"
        onClick={open}
        variant="subtle"
      >
        <IconHelp />
      </ActionIcon>
    </>
  );
};
