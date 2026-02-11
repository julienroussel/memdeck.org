import { Button, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SESSION_PRESETS, type SessionConfig } from "../types/session";

type SessionStartControlsProps = {
  onStart: (config: SessionConfig) => void;
};

export const SessionStartControls = ({
  onStart,
}: SessionStartControlsProps) => {
  const { t } = useTranslation();

  return (
    <Group align="center" gap="xs">
      <Text c="dimmed" size="sm">
        {t("session.startSession")}
      </Text>
      {SESSION_PRESETS.map((preset) => (
        <Button
          aria-label={t("session.startPresetAriaLabel", { count: preset })}
          key={preset}
          onClick={() =>
            onStart({ type: "structured", totalQuestions: preset })
          }
          size="compact-sm"
          variant="light"
        >
          {preset}
        </Button>
      ))}
    </Group>
  );
};
