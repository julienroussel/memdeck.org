import {
  Group,
  Image,
  Table,
  Text,
  TextInput,
  VisuallyHidden,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CARD_ASPECT_RATIO } from "../../constants";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { useStackLimits } from "../../hooks/use-stack-limits";
import { filterStack } from "./filter-stack";
import { useFormatCardName } from "./use-format-card-name";

const THUMBNAIL_WIDTH = 40;
const THUMBNAIL_HEIGHT = Math.round(THUMBNAIL_WIDTH * CARD_ASPECT_RATIO);

export const StackLookup = () => {
  const { t } = useTranslation();
  const { stackKey, stackOrder } = useRequiredStack();
  const { limits } = useStackLimits(stackKey);
  const [query, setQuery] = useState("");

  const formatCardName = useFormatCardName();

  const filtered = useMemo(
    () =>
      filterStack(stackOrder, query, formatCardName).filter(
        ({ position }) => position >= limits.start && position <= limits.end
      ),
    [stackOrder, query, formatCardName, limits.start, limits.end]
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.currentTarget.value);
  };

  return (
    <>
      <search>
        <TextInput
          aria-label={t("toolbox.lookup.searchAriaLabel")}
          leftSection={<IconSearch size={16} />}
          onChange={handleSearchChange}
          placeholder={t("toolbox.lookup.searchPlaceholder")}
          value={query}
        />
      </search>

      <VisuallyHidden>
        <div aria-atomic="true" aria-live="polite">
          {filtered.length === 0
            ? t("toolbox.lookup.noResults")
            : t("toolbox.lookup.resultCount", { count: filtered.length })}
        </div>
      </VisuallyHidden>

      {filtered.length === 0 ? (
        <Text c="dimmed" ta="center">
          {t("toolbox.lookup.noResults")}
        </Text>
      ) : (
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("toolbox.lookup.position")}</Table.Th>
              <Table.Th>{t("toolbox.lookup.card")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map(({ position, card }) => (
              <Table.Tr key={position}>
                <Table.Td>{position}</Table.Td>
                <Table.Td>
                  <Group gap={8} wrap="nowrap">
                    <Image
                      alt=""
                      h={THUMBNAIL_HEIGHT}
                      src={card.image}
                      w={THUMBNAIL_WIDTH}
                    />
                    {formatCardName(card)}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
};
