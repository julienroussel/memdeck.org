import { Button, Group, Text } from "@mantine/core";
import { SESSION_PRESETS, type SessionConfig } from "../types/session";

type SessionStartControlsProps = {
  onStart: (config: SessionConfig) => void;
};

export const SessionStartControls = ({
  onStart,
}: SessionStartControlsProps) => {
  return (
    <Group align="center" gap="xs">
      <Text c="dimmed" size="sm">
        Start session:
      </Text>
      {SESSION_PRESETS.map((preset) => (
        <Button
          aria-label={`Start ${preset} question session`}
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
