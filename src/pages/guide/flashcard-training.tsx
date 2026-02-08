import { Anchor, List, Space, Text } from "@mantine/core";
import { IconPlayCardStar } from "@tabler/icons-react";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const FlashcardTraining = () => (
  <section>
    <SectionHeading
      badge={{ label: "Requires stack" }}
      color="blue"
      icon={<IconPlayCardStar size={14} />}
      title="Flashcard Training"
    />
    <Space h="sm" />
    <Text>
      The main training mode. You're shown a prompt and must recall the matching
      card or position in your selected stack. Three modes are available:
    </Text>
    <Space h="xs" />
    <List spacing="xs">
      <List.Item>
        <Text fw={600} span>
          Card Only
        </Text>{" "}
        — shown a card, recall its position number
      </List.Item>
      <List.Item>
        <Text fw={600} span>
          Number Only
        </Text>{" "}
        — shown a position number, recall the card
      </List.Item>
      <List.Item>
        <Text fw={600} span>
          Both
        </Text>{" "}
        — randomly alternates between the two
      </List.Item>
    </List>
    <Space h="sm" />
    <Text>
      Tap the gear icon to open settings. You can enable an optional timer and
      choose between free-form practice or structured sessions with 10, 20, 30,
      or 52 card presets. Score tracking shows your accuracy and current streak.
    </Text>
    <Space h="xs" />
    <Anchor component={Link} to="/flashcard">
      Go to Flashcard Training
    </Anchor>
  </section>
);
