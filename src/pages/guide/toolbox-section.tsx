import { Anchor, Space, Text } from "@mantine/core";
import { IconTools } from "@tabler/icons-react";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const ToolboxSection = () => (
  <section>
    <SectionHeading
      badge={{ label: "Requires stack" }}
      color="yellow"
      icon={<IconTools size={14} />}
      title="Toolbox"
    />
    <Space h="sm" />
    <Text>
      A collection of memorized deck utilities for stack analysis and
      performance work. Use these tools to explore your selected stack, look up
      cards by position, and prepare for performances.
    </Text>
    <Space h="xs" />
    <Anchor component={Link} to="/toolbox">
      Go to Toolbox
    </Anchor>
  </section>
);
