import { Space, Text, Title } from "@mantine/core";
import { IconBook2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { JsonLd } from "../../components/json-ld";
import { SITE_URL } from "../../constants";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { AcaanTraining } from "./acaan-training";
import { FlashcardTraining } from "./flashcard-training";
import { GettingStarted } from "./getting-started";
import { ResourcesSection } from "./resources-section";
import { SpotCheckTraining } from "./spot-check-training";
import { StatsSection } from "./stats-section";
import { TipsSection } from "./tips-section";
import { ToolboxSection } from "./toolbox-section";
import { WhyDedicatedTool } from "./why-dedicated-tool";

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Practice a Memorized Deck with MemDeck",
  description:
    "Step-by-step guide to mastering a memorized deck of cards using MemDeck's training tools.",
  step: [
    {
      "@type": "HowToStep",
      name: "Select a stack",
      text: "Choose a memorized deck system from the stack picker. MemDeck supports Mnemonica, Aronson, Memorandum, Redford, Particle, Elephant, and Infinity.",
    },
    {
      "@type": "HowToStep",
      name: "Set your stack range",
      text: "Use the stack range control to focus on a subset of positions (e.g., 1–13). Start small and expand as you memorize more cards.",
    },
    {
      "@type": "HowToStep",
      name: "Train with flashcards",
      text: "Use Flashcard Training to drill card-to-number and number-to-card recall. Start with timed sessions of 10–20 cards.",
    },
    {
      "@type": "HowToStep",
      name: "Test with spot checks",
      text: "Use Spot Check to train your ability to detect missing, swapped, or moved cards in a deck spread.",
    },
    {
      "@type": "HowToStep",
      name: "Practice ACAAN calculations",
      text: "Use the ACAAN trainer to practice calculating cut depths for Any Card At Any Number effects.",
    },
    {
      "@type": "HowToStep",
      name: "Track your progress",
      text: "Review your accuracy trends and session history on the Stats page to monitor improvement over time.",
    },
  ],
};

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
      name: "Guide",
    },
  ],
};

export const Guide = () => {
  const { t } = useTranslation();

  useDocumentMeta({
    title: t("guide.pageTitle"),
    description: t("guide.pageDescription"),
  });

  return (
    <article>
      <JsonLd data={howToSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Title mb="xs" order={1}>
        <IconBook2 aria-hidden="true" size={28} stroke={1.5} />{" "}
        {t("guide.title")}
      </Title>
      <Text c="dimmed" mb="xl">
        {t("guide.subtitle")}
      </Text>
      <GettingStarted />
      <Space h="xl" />
      <FlashcardTraining />
      <Space h="xl" />
      <SpotCheckTraining />
      <Space h="xl" />
      <AcaanTraining />
      <Space h="xl" />
      <StatsSection />
      <Space h="xl" />
      <ResourcesSection />
      <Space h="xl" />
      <ToolboxSection />
      <Space h="xl" />
      <TipsSection />
      <Space h="xl" />
      <WhyDedicatedTool />
    </article>
  );
};
