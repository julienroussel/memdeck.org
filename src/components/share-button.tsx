import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCheck, IconShare } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { analytics } from "../services/analytics";
import { shareMemDeck } from "../utils/share";

type ShareButtonProps = {
  /** Visual variant — "icon" renders a compact icon button, "default" a standard one */
  variant?: "icon" | "default";
};

export const ShareButton = ({ variant = "icon" }: ShareButtonProps) => {
  const { t } = useTranslation();
  const [showCheck, setShowCheck] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleShare = useCallback(async () => {
    const result = await shareMemDeck(t("share.message"));
    analytics.trackShareClicked("nav", result);

    if (result === "copied") {
      setShowCheck(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowCheck(false), 2000);
    }
  }, [t]);

  const label = showCheck ? t("share.copied") : t("share.label");
  const icon = showCheck ? (
    <IconCheck aria-hidden="true" size={variant === "icon" ? 16 : 18} />
  ) : (
    <IconShare aria-hidden="true" size={variant === "icon" ? 16 : 18} />
  );

  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        aria-label={label}
        c={showCheck ? "green" : "dimmed"}
        onClick={handleShare}
        size={variant === "icon" ? "sm" : "lg"}
        variant="subtle"
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
};
