import { ActionIcon } from "@mantine/core";
import { IconBulb } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

type RevealButtonProps = {
  onReveal: () => void;
};

export const RevealButton = ({ onReveal }: RevealButtonProps) => {
  const { t } = useTranslation();

  return (
    <ActionIcon
      aria-label={t("common.revealAriaLabel")}
      color="yellow"
      onClick={onReveal}
      radius="xl"
      size="xl"
      style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200 }}
      variant="filled"
    >
      <IconBulb aria-hidden="true" />
    </ActionIcon>
  );
};
