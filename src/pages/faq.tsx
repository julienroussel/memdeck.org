import { Anchor, Space, Text, Title } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { JsonLd } from "../components/json-ld";
import { ROUTES, SITE_URL } from "../constants";
import { useDocumentMeta } from "../hooks/use-document-meta";

const FAQ_KEYS = [
  "whatIsMemDeck",
  "bestForBeginners",
  "howLong",
  "whatIsMnemonica",
  "whatIsAronson",
  "whatIsAcaan",
  "differenceMnemonicaAronson",
  "howToPractice",
  "whatIsFaro",
  "offline",
] as const;

export const Faq = () => {
  const { t } = useTranslation();

  useDocumentMeta({
    title: t("faq.pageTitle"),
    description: t("faq.pageDescription"),
  });

  const faqItems = useMemo(
    () =>
      FAQ_KEYS.map((key) => ({
        question: t(`faq.${key}Q`),
        answer: t(`faq.${key}A`),
      })),
    [t]
  );

  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org" as const,
      "@type": "FAQPage" as const,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    }),
    [faqItems]
  );

  const breadcrumbSchema = useMemo(
    () => ({
      "@context": "https://schema.org" as const,
      "@type": "BreadcrumbList" as const,
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
          name: t("faq.title"),
        },
      ],
    }),
    [t]
  );

  return (
    <article>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <Title mb="xs" order={1}>
        <IconHelpCircle aria-hidden="true" size={28} stroke={1.5} />{" "}
        {t("faq.title")}
      </Title>
      <Text c="dimmed" mb="xl">
        {t("faq.subtitle")}
      </Text>
      {faqItems.map((item) => (
        <section key={item.question}>
          <Title mb="xs" mt="lg" order={2}>
            {item.question}
          </Title>
          <Text>{item.answer}</Text>
        </section>
      ))}
      <Space h="xl" />
      <Anchor component={Link} to={ROUTES.guide}>
        {t("faq.readGuide")}
      </Anchor>
    </article>
  );
};
