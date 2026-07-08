import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { WhatsNewEntry, WhatsNewType } from "../../data/whats-new";
import type { SupportedLanguage } from "../../i18n/supported-languages";
import { formatReleaseDate } from "../../utils/format-release-date";

const TYPE_LABEL_KEYS = {
  feature: "whatsNew.typeFeature",
  fix: "whatsNew.typeFix",
  stack: "whatsNew.typeStack",
} as const satisfies Record<WhatsNewType, string>;

const TYPE_COLORS = {
  feature: "blue",
  fix: "teal",
  stack: "grape",
} as const satisfies Record<WhatsNewType, string>;

type WhatsNewEntryCardProps = {
  entry: WhatsNewEntry;
  lang: SupportedLanguage;
};

export const WhatsNewEntryCard = ({ entry, lang }: WhatsNewEntryCardProps) => {
  const { t } = useTranslation();
  const body = entry.body?.[lang];

  return (
    <Card component="article" padding="md" radius="md" withBorder>
      <Stack gap="xs">
        <Group gap="xs" justify="space-between" wrap="wrap">
          <Badge color={TYPE_COLORS[entry.type]} variant="light">
            {t(TYPE_LABEL_KEYS[entry.type])}
          </Badge>
          <Text c="dimmed" size="sm">
            <time dateTime={entry.releasedAt}>
              {formatReleaseDate(entry.releasedAt, lang)}
            </time>
          </Text>
        </Group>
        <Title order={2} size="h4">
          {entry.title[lang]}
        </Title>
        {body ? <Text>{body}</Text> : null}
      </Stack>
    </Card>
  );
};
