import { Badge, Image, Table, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CARD_ASPECT_RATIO } from "../../constants";
import type { PlayingCard } from "../../types/playingcard";
import type { Stack } from "../../types/stacks";

const THUMBNAIL_WIDTH = 32;
const THUMBNAIL_HEIGHT = Math.round(THUMBNAIL_WIDTH * CARD_ASPECT_RATIO);
const CARD_CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 6,
} as const;

type SpellingStep = {
  key: string;
  letter: string;
  position: number;
  card: PlayingCard | undefined;
  isLast: boolean;
};

export const buildSpellingSteps = (
  cardName: string,
  stackOrder: Stack
): SpellingStep[] => {
  const letters = cardName.split("").filter((ch) => ch !== " ");
  return letters.map((letter, i) => ({
    key: `${letter}-${i}`,
    letter,
    position: i + 1,
    card: i < stackOrder.length ? stackOrder[i] : undefined,
    isLast: i === letters.length - 1,
  }));
};

type SpellingDetailProps = {
  cardName: string;
  stackOrder: Stack;
  formatCardName: (card: PlayingCard) => string;
};

export const SpellingDetail = ({
  cardName,
  stackOrder,
  formatCardName,
}: SpellingDetailProps) => {
  const { t } = useTranslation();

  const steps = useMemo(
    () => buildSpellingSteps(cardName, stackOrder),
    [cardName, stackOrder]
  );

  return (
    <Table aria-label={`${t("toolbox.spelling.detailTitle")}: ${cardName}`}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("toolbox.spelling.letter")}</Table.Th>
          <Table.Th>{t("toolbox.spelling.position")}</Table.Th>
          <Table.Th>{t("toolbox.spelling.dealtCard")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {steps.map((step) => (
          <Table.Tr
            key={step.key}
            style={step.isLast ? { fontWeight: 700 } : undefined}
          >
            <Table.Td>
              {step.letter}
              {step.isLast && (
                <>
                  {" "}
                  <Badge size="xs" variant="light">
                    {t("toolbox.spelling.landsOn")}
                  </Badge>
                </>
              )}
            </Table.Td>
            <Table.Td>{step.position}</Table.Td>
            <Table.Td>
              {step.card ? (
                <Text component="span" style={CARD_CELL_STYLE}>
                  <Image
                    alt=""
                    h={THUMBNAIL_HEIGHT}
                    src={step.card.image}
                    w={THUMBNAIL_WIDTH}
                  />
                  {formatCardName(step.card)}
                </Text>
              ) : (
                "—"
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
};
