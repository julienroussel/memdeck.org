import { Button, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { DECK_SIZE, MIN_SPOT_CHECK_RANGE } from "../constants";
import { useStackLimits } from "../hooks/use-stack-limits";
import type { StackKey } from "../types/stacks";
import { StackLimitsControl } from "./stack-limits-control";

type StackRangeBadgeProps = {
  stackKey: StackKey;
};

export const StackRangeBadge = ({ stackKey }: StackRangeBadgeProps) => {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const {
    limits,
    setLimits,
    rangeSize,
    isFullDeck: full,
  } = useStackLimits(stackKey);

  const label = full
    ? t("stackLimits.badgeFull", { count: DECK_SIZE })
    : t("stackLimits.badgePartial", {
        end: limits.end,
        start: limits.start,
      });

  return (
    <>
      <Button
        aria-expanded={opened}
        aria-haspopup="dialog"
        aria-label={
          full
            ? t("stackLimits.badgeFullAriaLabel", { count: DECK_SIZE })
            : t("stackLimits.badgePartialAriaLabel", {
                end: limits.end,
                start: limits.start,
              })
        }
        color={full ? "gray" : "blue"}
        onClick={open}
        rightSection={<IconChevronDown aria-hidden="true" size={14} />}
        size="sm"
        variant={full ? "default" : "light"}
      >
        {label}
      </Button>
      <Modal
        centered
        onClose={close}
        opened={opened}
        title={t("stackLimits.label")}
      >
        <Stack gap="md">
          <StackLimitsControl limits={limits} onLimitsChange={setLimits} />
          {rangeSize < MIN_SPOT_CHECK_RANGE && (
            <Text c="orange" role="status" size="xs">
              <IconAlertTriangle
                aria-hidden="true"
                size={14}
                style={{ marginRight: 4, verticalAlign: "middle" }}
              />{" "}
              {t("stackLimits.spotCheckHint", {
                count: MIN_SPOT_CHECK_RANGE,
              })}
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
};
