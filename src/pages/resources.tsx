import {
  Anchor,
  Badge,
  Card,
  Group,
  List,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import { GITHUB_URL } from "../constants";
import { useDocumentMeta } from "../hooks/use-document-meta";
import type en from "../i18n/locales/en.json";

/** Valid i18n keys for resource description translations, derived from en.json */
type ResourceI18nKey =
  `resources.descriptions.${keyof (typeof en)["resources"]["descriptions"] & string}`;

/** Valid i18n keys for common translations, derived from en.json */
type CommonI18nKey = `common.${keyof (typeof en)["common"] & string}`;

type Resource = {
  title: string;
  author: string;
  descriptionKey: ResourceI18nKey;
  link: string;
};

type PrimaryResource = Resource & {
  category: "book" | "pdf";
};

const CATEGORY_LABELS = {
  book: "common.book",
  pdf: "common.pdf",
} as const satisfies Record<PrimaryResource["category"], CommonI18nKey>;

const primaryResources = [
  {
    title: "Mnemonica",
    author: "Juan Tamariz",
    descriptionKey: "resources.descriptions.mnemonica",
    link: "https://www.vanishingincmagic.com/card-magic/mnemonica/",
    category: "book",
  },
  {
    title: "The Aronson Approach",
    author: "Simon Aronson",
    descriptionKey: "resources.descriptions.aronsonApproach",
    link: "https://www.vanishingincmagic.com/card-magic/the-aronson-approach/",
    category: "book",
  },
  {
    title: "Bound to Please",
    author: "Simon Aronson",
    descriptionKey: "resources.descriptions.boundToPlease",
    link: "https://www.vanishingincmagic.com/card-magic/bound-to-please/",
    category: "book",
  },
  {
    title: "Memories Are Made of This",
    author: "Simon Aronson",
    descriptionKey: "resources.descriptions.memoriesAreMade",
    link: "http://simonaronson.com/Memories%20Are%20Made%20of%20This.pdf",
    category: "pdf",
  },
] as const satisfies readonly PrimaryResource[];

const otherResources = [
  {
    title: "The Magic Rainbow",
    author: "Juan Tamariz",
    link: "https://www.vanishingincmagic.com/magic-theory/tamariz-magic-rainbow/",
    descriptionKey: "resources.descriptions.magicRainbow",
  },
  {
    title: "In Order To Amaze",
    author: "Pit Hartling",
    link: "https://pithartling.com/shop/#in-order-to-amaze",
    descriptionKey: "resources.descriptions.inOrderToAmaze",
  },
  {
    title: "Memorandum",
    author: "Woody Arag\u00f3n",
    link: "https://www.vanishingincmagic.com/card-magic/memorandum/",
    descriptionKey: "resources.descriptions.memorandum",
  },
  {
    title: "Temporarily Out of Order",
    author: "Patrick Redford",
    link: "https://www.murphysmagic.com/product.aspx?id=59497",
    descriptionKey: "resources.descriptions.temporarilyOutOfOrder",
  },
  {
    title: "Applesauce",
    author: "Patrick Redford",
    link: "https://patrickredford.com/product/applesauce/",
    descriptionKey: "resources.descriptions.applesauce",
  },
  {
    title: "Sleightly Out of Order",
    author: "Patrick Redford",
    link: "https://patrickredford.com/product/sleightly-out-of-order/",
    descriptionKey: "resources.descriptions.sleightlyOutOfOrder",
  },
  {
    title: "Particle System",
    author: "Joshua Jay",
    link: "https://www.vanishingincmagic.com/magic-books/particle-system/",
    descriptionKey: "resources.descriptions.particleSystem",
  },
] as const satisfies readonly Resource[];

const ResourceCard = ({ resource }: { resource: PrimaryResource }) => {
  const { t } = useTranslation();
  return (
    <Card padding="lg" radius="md" shadow="sm" withBorder>
      <Group>
        <Title order={3}>{resource.title}</Title>
        <Badge color="blue" variant="light">
          {t(CATEGORY_LABELS[resource.category])}
        </Badge>
      </Group>
      <Text c="dimmed" fs="italic" mb="xs" size="sm">
        {resource.author}
      </Text>
      <Text c="dimmed" mb="md" size="sm">
        {t(resource.descriptionKey)}
      </Text>
      <Anchor href={resource.link} rel="noopener" size="sm" target="_blank">
        {t("common.learnMore")}
      </Anchor>
    </Card>
  );
};

const ResourceListItem = ({ resource }: { resource: Resource }) => {
  const { t } = useTranslation();
  return (
    <List.Item>
      <Anchor href={resource.link} rel="noopener" target="_blank">
        {resource.title}
      </Anchor>{" "}
      (
      <Text c="dimmed" fs="italic" size="sm" span>
        {resource.author}
      </Text>
      ) : <Text span>{t(resource.descriptionKey)}</Text>
    </List.Item>
  );
};

export const Resources = () => {
  const { t } = useTranslation();
  useDocumentMeta({
    title: t("resources.pageTitle"),
    description: t("resources.pageDescription"),
  });

  return (
    <>
      <Title mb="md" order={1}>
        {t("resources.title")}
      </Title>
      <Text mb="xl">
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
          i18nKey="resources.intro"
        />
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        {primaryResources.map((resource) => (
          <ResourceCard key={resource.title} resource={resource} />
        ))}
      </SimpleGrid>

      <Title mb="md" mt="xl" order={2}>
        {t("resources.otherResources")}
      </Title>
      <List
        center
        icon={
          <ThemeIcon color="blue" radius="xl" size={24}>
            <IconExternalLink size={16} />
          </ThemeIcon>
        }
        size="md"
        spacing="sm"
      >
        {otherResources.map((resource) => (
          <ResourceListItem key={resource.title} resource={resource} />
        ))}
      </List>
    </>
  );
};
