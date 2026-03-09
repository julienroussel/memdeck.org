import { Button, Group, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SESSION_PRESETS, type SessionConfig } from "../types/session";

type SessionStartControlsProps = {
  onStart: (config: SessionConfig) => void;
  onAfterStart?: () => void;
  rangeSize?: number;
};

export const SessionStartControls = ({
  onStart,
  onAfterStart,
  rangeSize,
}: SessionStartControlsProps) => {
  const { t } = useTranslation();
  const effectiveRange = Math.max(1, rangeSize ?? 52);

  const visiblePresets = useMemo(() => {
    const presets: number[] = SESSION_PRESETS.filter(
      (p) => p <= effectiveRange
    );
    if (effectiveRange < 52 && !presets.includes(effectiveRange)) {
      presets.push(effectiveRange);
    }
    if (presets.length === 0) {
      presets.push(effectiveRange);
    }
    return presets;
  }, [effectiveRange]);

  const handlePresetClick = (preset: number) => {
    onStart({ type: "structured", totalQuestions: preset });
    onAfterStart?.();
  };

  return (
    <Group align="center" gap="xs">
      <Text c="dimmed" size="sm">
        {t("session.startSession")}
      </Text>
      {visiblePresets.map((preset) => (
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
