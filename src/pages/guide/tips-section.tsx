import { List, Space } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { SectionHeading } from "./section-heading";

export const TipsSection = () => (
  <section>
    <SectionHeading
      color="cyan"
      icon={<IconInfoCircle size={14} />}
      title="Tips"
    />
    <Space h="sm" />
    <List spacing="xs">
      <List.Item>
        All your data stays in your browser — nothing is sent to a server.
      </List.Item>
      <List.Item>
        Toggle between dark and light mode using the icon in the header.
      </List.Item>
      <List.Item>
        In training modes, tap the gear icon to open settings for timer, session
        length, and mode options.
      </List.Item>
      <List.Item>
        Switching stacks doesn't lose your data — progress is tracked per stack.
      </List.Item>
    </List>
  </section>
);
