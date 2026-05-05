import { Center, Image, Text } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { CARD_HEIGHT, CARD_WIDTH } from "../../constants";
import type { DistanceConvention } from "../../types/distance";
import type { PlayingCardPosition } from "../../types/stacks";
import { formatCardName } from "../../utils/card-formatting";

type DistancePromptDisplayProps =
  | {
      display: "compute";
      promptCard: PlayingCardPosition;
      targetCard: PlayingCardPosition;
    }
  | {
      display: "apply";
      promptCard: PlayingCardPosition;
      offset: number;
      convention: DistanceConvention;
    };

const formatOffset = (
  offset: number,
  convention: DistanceConvention
): string => {
  if (convention === "signed" && offset > 0) {
    return `+${offset}`;
  }
  return String(offset);
};

const wrapperStyle = {
  display: "flex",
  alignItems: "center",
  gap: 16,
} as const;

export const DistancePromptDisplay = (props: DistancePromptDisplayProps) => {
  const { t } = useTranslation();

  if (props.display === "compute") {
    const { promptCard, targetCard } = props;
    const computeLabel = t("distance.promptComputeAriaLabel", {
      from: formatCardName(promptCard.card),
      to: formatCardName(targetCard.card),
    });
    return (
      <Center>
        <div style={wrapperStyle}>
          <span className="sr-only">{computeLabel}</span>
          <Image
            alt=""
            className="cardShadow"
            data-testid="distance-prompt-card"
            h={CARD_HEIGHT}
            src={promptCard.card.image}
            w={CARD_WIDTH}
          />
          <IconArrowRight aria-hidden="true" size={32} />
          <Image
            alt=""
            className="cardShadow"
            data-testid="distance-target-card"
            h={CARD_HEIGHT}
            src={targetCard.card.image}
            w={CARD_WIDTH}
          />
        </div>
      </Center>
    );
  }

  const { promptCard, offset, convention } = props;
  const offsetLabel = formatOffset(offset, convention);
  const applyLabel = t("distance.promptApplyAriaLabel", {
    offset: offsetLabel,
    card: formatCardName(promptCard.card),
  });

  return (
    <Center>
      <div style={wrapperStyle}>
        <span className="sr-only">{applyLabel}</span>
        <Image
          alt=""
          className="cardShadow"
          data-testid="distance-prompt-card"
          h={CARD_HEIGHT}
          src={promptCard.card.image}
          w={CARD_WIDTH}
        />
        <div
          aria-hidden="true"
          data-testid="distance-offset-badge"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 64,
          }}
        >
          <Text fw={600} size="xl">
            {offsetLabel}
          </Text>
        </div>
      </div>
    </Center>
  );
};
