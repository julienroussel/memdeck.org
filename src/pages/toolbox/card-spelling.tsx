import { Stack, Table, Text, TextInput, VisuallyHidden } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { filterStack } from "./filter-stack";
import { getSpellingData } from "./spell-card";
import { SpellingRow } from "./spelling-row";
import { useFormatCardName } from "./use-format-card-name";

export const CardSpelling = () => {
  const { t } = useTranslation();
  const { stackOrder } = useRequiredStack();
  const [query, setQuery] = useState("");
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);

  const formatCardName = useFormatCardName();

  const spellingData = useMemo(
    () => getSpellingData(stackOrder, formatCardName),
    [stackOrder, formatCardName]
  );

  const visibleEntries = useMemo(() => {
    const filtered = filterStack(stackOrder, query, formatCardName);
    const filteredPositions = new Set(filtered.map((e) => e.position));
    return spellingData.filter((e) => filteredPositions.has(e.position));
  }, [stackOrder, query, formatCardName, spellingData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.currentTarget.value);
  };

  const handleRowToggle = (position: number) => {
    setExpandedPosition((prev) => (prev === position ? null : position));
  };

  return (
    <Stack gap="md">
      <search aria-label={t("toolbox.spelling.searchAriaLabel")}>
        <TextInput
          aria-label={t("toolbox.spelling.searchAriaLabel")}
          leftSection={<IconSearch size={16} />}
          onChange={handleSearchChange}
          placeholder={t("toolbox.spelling.searchPlaceholder")}
          value={query}
        />
      </search>

      <VisuallyHidden>
        <div aria-atomic="true" aria-live="polite">
          {visibleEntries.length === 0
            ? t("toolbox.spelling.noResults")
            : t("toolbox.spelling.resultCount", {
                count: visibleEntries.length,
              })}
        </div>
      </VisuallyHidden>

      {visibleEntries.length === 0 ? (
        <Text c="dimmed" ta="center">
          {t("toolbox.spelling.noResults")}
        </Text>
      ) : (
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("toolbox.spelling.position")}</Table.Th>
              <Table.Th>{t("toolbox.spelling.card")}</Table.Th>
              <Table.Th>{t("toolbox.spelling.letters")}</Table.Th>
              <Table.Th>{t("toolbox.spelling.landsOn")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleEntries.map((entry) => (
              <SpellingRow
                entry={entry}
                formatCardName={formatCardName}
                isExpanded={expandedPosition === entry.position}
                key={entry.position}
                onToggle={handleRowToggle}
                stackOrder={stackOrder}
              />
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
};
