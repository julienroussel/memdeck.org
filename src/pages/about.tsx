import {
  Anchor,
  Group,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconExternalLink,
  IconShare,
} from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { JsonLd } from "../components/json-ld";
import {
  GITHUB_URL,
  LINKTREE_URL,
  MAGIC_LAB_URL,
  SITE_URL,
} from "../constants";
import { useDocumentMeta } from "../hooks/use-document-meta";
import { analytics } from "../services/analytics";
import { shareMemDeck } from "../utils/share";

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "About",
    },
  ],
};

export const About = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("about.pageTitle"),
    description: t("about.pageDescription"),
  });

  const handleShare = useCallback(async () => {
    const result = await shareMemDeck(t("share.message"));
    analytics.trackShareClicked("about", result);
  }, [t]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <Title mb="md" order={1}>
        {t("about.title")}
      </Title>
      <Text c="dimmed" mb="md" size="sm">
        {t("about.seoIntro")}
      </Text>
      <Text mb="xl">{t("about.intro")}</Text>
      <Stack gap="sm">
        <Group gap="xs">
          <IconBrandGithub aria-hidden="true" size={20} stroke={1.5} />
          <Anchor href={GITHUB_URL} rel="noopener" target="_blank">
            GitHub
            <VisuallyHidden> (opens in new tab)</VisuallyHidden>
          </Anchor>
          <Text c="dimmed" size="sm">
            — {t("about.githubDescription")}
          </Text>
        </Group>
        <Group gap="xs">
          <IconExternalLink aria-hidden="true" size={20} stroke={1.5} />
          <Anchor href={MAGIC_LAB_URL} rel="noopener" target="_blank">
            The Magic Lab
            <VisuallyHidden> (opens in new tab)</VisuallyHidden>
          </Anchor>
          <Text c="dimmed" size="sm">
            — {t("about.magicLabDescription")}
          </Text>
        </Group>
        <Group gap="xs">
          <IconExternalLink aria-hidden="true" size={20} stroke={1.5} />
          <Anchor href={LINKTREE_URL} rel="noopener" target="_blank">
            Linktree
            <VisuallyHidden> (opens in new tab)</VisuallyHidden>
          </Anchor>
          <Text c="dimmed" size="sm">
            — {t("about.linktreeDescription")}
          </Text>
        </Group>
        <Group gap="xs">
          <IconShare aria-hidden="true" size={20} stroke={1.5} />
          <Anchor component="button" onClick={handleShare} type="button">
            {t("share.label")}
          </Anchor>
          <Text c="dimmed" size="sm">
            — {t("share.nudgeMessage")}
          </Text>
        </Group>
      </Stack>
    </>
  );
};
