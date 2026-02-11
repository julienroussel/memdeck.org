import { Space, Text, Title } from "@mantine/core";
import { IconBook2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../../hooks/use-document-meta";
import { AcaanTraining } from "./acaan-training";
import { FlashcardTraining } from "./flashcard-training";
import { GettingStarted } from "./getting-started";
import { ResourcesSection } from "./resources-section";
import { StatsSection } from "./stats-section";
import { TipsSection } from "./tips-section";
import { ToolboxSection } from "./toolbox-section";

export const Guide = () => {
  const { t } = useTranslation();

  useDocumentMeta({
    title: t("guide.pageTitle"),
    description: t("guide.pageDescription"),
  });

  return (
    <article>
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
      <AcaanTraining />
      <Space h="xl" />
      <StatsSection />
      <Space h="xl" />
      <ResourcesSection />
      <Space h="xl" />
      <ToolboxSection />
      <Space h="xl" />
      <TipsSection />
    </article>
  );
};
