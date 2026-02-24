import {
  Image,
  NumberInput,
  Stack,
  Table,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CARD_ASPECT_RATIO } from "../../constants";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { computeSequences } from "./compute-sequences";
import { useFormatCardName } from "./use-format-card-name";

const THUMBNAIL_WIDTH = 40;
const THUMBNAIL_HEIGHT = Math.round(THUMBNAIL_WIDTH * CARD_ASPECT_RATIO);
const CARD_CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 8,
} as const;

const MIN_STEP = 1;
const MAX_STEP = 52;

export const StayStack = () => {
  const { t } = useTranslation();
  const { stackOrder } = useRequiredStack();
  const [step, setStep] = useState<number>(2);

  const formatCardName = useFormatCardName();

  const result = useMemo(
    () => computeSequences(stackOrder, step),
    [stackOrder, step]
  );

  const handleStepChange = (value: string | number) => {
    if (typeof value === "number") {
      setStep(value);
    }
  };

  return (
    <Stack gap="md">
      <NumberInput
        label={t("toolbox.sequences.stepLabel")}
        max={MAX_STEP}
        min={MIN_STEP}
        onChange={handleStepChange}
        value={step}
      />

      <Text size="sm">
        {t("toolbox.sequences.summary", {
          cycleCount: result.cycleCount,
          cycleLength: result.cycleLength,
        })}
      </Text>

      <VisuallyHidden>
        <div aria-atomic="true" aria-live="polite">
          {t("toolbox.sequences.summary", {
            cycleCount: result.cycleCount,
            cycleLength: result.cycleLength,
          })}
        </div>
      </VisuallyHidden>

      {result.cycles.map((cycle, cycleIndex) => (
        <Table
          aria-label={t("toolbox.sequences.cycleLabel", {
            current: cycleIndex + 1,
            total: result.cycleCount,
          })}
          key={cycle[0].position}
          striped
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th colSpan={2}>
                {t("toolbox.sequences.cycleLabel", {
                  current: cycleIndex + 1,
                  total: result.cycleCount,
                })}
              </Table.Th>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>{t("toolbox.sequences.position")}</Table.Th>
              <Table.Th>{t("toolbox.sequences.card")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {cycle.map((entry) => (
              <Table.Tr key={`${entry.card.rank}-${entry.card.suit}`}>
                <Table.Td>{entry.position}</Table.Td>
                <Table.Td style={CARD_CELL_STYLE}>
                  <Image
                    alt=""
                    h={THUMBNAIL_HEIGHT}
                    src={entry.card.image}
                    w={THUMBNAIL_WIDTH}
                  />
                  {formatCardName(entry.card)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ))}
    </Stack>
  );
};
