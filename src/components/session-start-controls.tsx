import { Button, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  SESSION_PRESETS,
  type SessionConfig,
  type SessionPreset,
} from "../types/session";

type SessionStartControlsProps = {
  onStart: (config: SessionConfig) => void;
  onAfterStart?: () => void;
};

export const SessionStartControls = ({
  onStart,
  onAfterStart,
}: SessionStartControlsProps) => {
  const { t } = useTranslation();

  const handlePresetClick = (preset: SessionPreset) => {
    onStart({ type: "structured", totalQuestions: preset });
    onAfterStart?.();
  };

  return (
    <Group align="center" gap="xs">
      <Text c="dimmed" size="sm">
        {t("session.startSession")}
      </Text>
      {SESSION_PRESETS.map((preset) => (
        <Button
          aria-label={t("session.startPresetAriaLabel", { count: preset })}
          key={preset}
          onClick={() => handlePresetClick(preset)}
          size="compact-sm"
          variant="light"
        >
          {preset}
        </Button>
      ))}
    </Group>
  );
};
