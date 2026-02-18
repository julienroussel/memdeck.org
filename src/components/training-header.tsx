import { ActionIcon, Group, Title } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { GameScore } from "../types/game";
import type { ActiveSession, SessionConfig } from "../types/session";
import { Score } from "./score";
import { SessionBanner } from "./session-banner";
import { SessionStartControls } from "./session-start-controls";

type TrainingHeaderProps = {
  title: ReactNode;
  settingsAriaLabel: string;
  onOpenSettings: () => void;
  score: GameScore;
  isStructuredSession: boolean;
  activeSession: ActiveSession | null;
  onStopSession: () => void;
  onStartSession: (config: SessionConfig) => void;
};

export const TrainingHeader = ({
  title,
  settingsAriaLabel,
  onOpenSettings,
  score,
  isStructuredSession,
  activeSession,
  onStopSession,
  onStartSession,
}: TrainingHeaderProps) => (
  <>
    <Group gap="xs" justify="space-between">
      <Title order={1}>{title}</Title>
      <Group gap="xs">
        {!isStructuredSession && (
          <Score fails={score.fails} successes={score.successes} />
        )}
        <ActionIcon
          aria-label={settingsAriaLabel}
          color="gray"
          onClick={onOpenSettings}
          variant="subtle"
        >
          <IconSettings aria-hidden="true" />
        </ActionIcon>
      </Group>
    </Group>
    {isStructuredSession && activeSession && (
      <SessionBanner onStop={onStopSession} session={activeSession} />
    )}
    {!isStructuredSession && <SessionStartControls onStart={onStartSession} />}
  </>
);
