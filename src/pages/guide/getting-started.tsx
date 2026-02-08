import { Alert, List, Space, Text } from "@mantine/core";
import { IconInfoCircle, IconRocket } from "@tabler/icons-react";
import { SectionHeading } from "./section-heading";

export const GettingStarted = () => (
  <section>
    <SectionHeading
      color="green"
      icon={<IconRocket size={14} />}
      title="Getting Started"
    />
    <Space h="sm" />
    <Text>
      MemDeck is a training tool for magicians and memory enthusiasts who want
      to master a memorized deck. It helps you drill card positions through
      flashcard exercises and utilities so you can recall any card at any
      position — instantly.
    </Text>
    <Space h="sm" />
    <Text>
      To get started, select a stack using the dropdown at the bottom of the
      sidebar. MemDeck supports five classic memorized deck systems:
    </Text>
    <Space h="xs" />
    <List spacing="xs">
      <List.Item>
        <Text fw={600} span>
          Tamariz (Mnemonica)
        </Text>{" "}
        — Juan Tamariz
      </List.Item>
      <List.Item>
        <Text fw={600} span>
          Aronson
        </Text>{" "}
        — Simon Aronson
      </List.Item>
      <List.Item>
        <Text fw={600} span>
          Memorandum
        </Text>{" "}
        — Woody Aragón
      </List.Item>
      <List.Item>
        <Text fw={600} span>
          Redford Stack
        </Text>{" "}
        — Patrick Redford
      </List.Item>
      <List.Item>
        <Text fw={600} span>
          Particle System
        </Text>{" "}
        — Joshua Jay
      </List.Item>
    </List>
    <Space h="sm" />
    <Alert
      color="blue"
      icon={<IconInfoCircle size={16} />}
      title="Pick a stack first"
    >
      Most training tools require a selected stack to work. Pick one to unlock
      Flashcard, ACAAN, and Toolbox modes.
    </Alert>
  </section>
);
