import {
  ActionIcon,
  Group,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings, IconTarget } from "@tabler/icons-react";
import { type ReactNode, useCallback } from "react";
import type { GameScore } from "../types/game";
import type { ActiveSession, SessionConfig } from "../types/session";
import { deriveIsStructuredSession } from "../utils/session-phase";
import { Score } from "./score";
import { SessionBanner } from "./session-banner";
import { SessionStartControls } from "./session-start-controls";

type TrainingHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  settingsTooltip: string;
  sessionTooltip: string;
  settingsContent: ReactNode;
  score: GameScore;
  activeSession: ActiveSession | null;
  onStopSession: () => void;
  onStartSession: (config: SessionConfig) => void;
  rangeSize?: number;
};

export const TrainingHeader = ({
  title,
  subtitle,
  settingsTooltip,
  sessionTooltip,
  settingsContent,
  score,
  activeSession,
  onStopSession,
  onStartSession,
  rangeSize,
}: TrainingHeaderProps) => {
  const [sessionOpened, { toggle: toggleSession, close: closeSession }] =
    useDisclosure(false);
  const [settingsOpened, { toggle: toggleSettings, close: closeSettings }] =
    useDisclosure(false);

  const handleToggleSession = useCallback(() => {
    closeSettings();
    toggleSession();
  }, [closeSettings, toggleSession]);

  const handleToggleSettings = useCallback(() => {
    closeSession();
    toggleSettings();
  }, [closeSession, toggleSettings]);

  const structuredSession = deriveIsStructuredSession(activeSession)
    ? activeSession
    : null;

  return (
    <>
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Title className="trainingHeaderTitle" order={1}>
            {title}
          </Title>
          {subtitle ? (
            <Text c="dimmed" fs="italic" size="xs">
              {subtitle}
            </Text>
          ) : null}
        </Stack>
        <Group gap="xs" wrap="nowrap">
          {structuredSession === null && (
            <Score fails={score.fails} successes={score.successes} />
          )}
          <Popover
            onClose={closeSession}
            opened={sessionOpened}
            position="bottom-end"
            returnFocus
            transitionProps={{ duration: 0 }}
            trapFocus
            withArrow
          >
            <Tooltip label={sessionTooltip}>
              <Popover.Target>
                <ActionIcon
                  aria-expanded={sessionOpened}
                  aria-haspopup="dialog"
                  aria-label={sessionTooltip}
                  color="gray"
                  onClick={handleToggleSession}
                  variant="subtle"
                >
                  <IconTarget aria-hidden="true" />
                </ActionIcon>
              </Popover.Target>
            </Tooltip>
            <Popover.Dropdown>
              <SessionStartControls
                onAfterStart={closeSession}
                onStart={onStartSession}
                rangeSize={rangeSize}
              />
            </Popover.Dropdown>
          </Popover>
          <Popover
            onClose={closeSettings}
            opened={settingsOpened}
            position="bottom-end"
            returnFocus
            transitionProps={{ duration: 0 }}
            trapFocus
            withArrow
          >
            <Tooltip label={settingsTooltip}>
              <Popover.Target>
                <ActionIcon
                  aria-expanded={settingsOpened}
                  aria-haspopup="dialog"
                  aria-label={settingsTooltip}
                  color="gray"
                  onClick={handleToggleSettings}
                  variant="subtle"
                >
                  <IconSettings aria-hidden="true" />
                </ActionIcon>
              </Popover.Target>
            </Tooltip>
            <Popover.Dropdown>{settingsContent}</Popover.Dropdown>
          </Popover>
        </Group>
      </Group>
      {structuredSession ? (
        <SessionBanner onStop={onStopSession} session={structuredSession} />
      ) : null}
    </>
  );
};
