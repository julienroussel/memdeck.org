import {
  Image,
  NumberInput,
  SegmentedControl,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CARD_ASPECT_RATIO } from "../../constants";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { applyFaro, type FaroType } from "./apply-faro";
import { useFormatCardName } from "./use-format-card-name";

const THUMBNAIL_WIDTH = 40;
const THUMBNAIL_HEIGHT = Math.round(THUMBNAIL_WIDTH * CARD_ASPECT_RATIO);
const CARD_CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 8,
} as const;

const MIN_COUNT = 0;
const MAX_COUNT = 52;

export const FaroShuffle = () => {
  const { t } = useTranslation();
  const { stackOrder } = useRequiredStack();
  const [faroType, setFaroType] = useState<FaroType>("out");
  const [count, setCount] = useState<number>(1);

  const formatCardName = useFormatCardName();

  const result = useMemo(
    () => applyFaro(stackOrder, faroType, count),
    [stackOrder, faroType, count]
  );

  const handleTypeChange = (value: string) => {
    if (value === "in" || value === "out") {
      setFaroType(value);
    }
  };

  const handleCountChange = (value: string | number) => {
    if (typeof value === "number") {
      setCount(value);
    }
  };

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text fw={500} size="sm">
          {t("toolbox.faro.typeLabel")}
        </Text>
        <SegmentedControl
          aria-label={t("toolbox.faro.typeLabel")}
          data={[
            { label: t("toolbox.faro.out"), value: "out" },
            { label: t("toolbox.faro.in"), value: "in" },
          ]}
          onChange={handleTypeChange}
          value={faroType}
        />
      </Stack>

      <NumberInput
        label={t("toolbox.faro.countLabel")}
        max={MAX_COUNT}
        min={MIN_COUNT}
        onChange={handleCountChange}
        value={count}
      />

      <Table aria-label={t("toolbox.faro.title")} striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("toolbox.faro.position")}</Table.Th>
            <Table.Th>{t("toolbox.faro.card")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {result.map((card, index) => (
            <Table.Tr key={`${card.rank}-${card.suit}`}>
              <Table.Td>{index + 1}</Table.Td>
              <Table.Td style={CARD_CELL_STYLE}>
                <Image
                  alt=""
                  h={THUMBNAIL_HEIGHT}
                  src={card.image}
                  w={THUMBNAIL_WIDTH}
                />
                {formatCardName(card)}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
};
