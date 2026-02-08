import { Anchor, Space, Text } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const StatsSection = () => (
  <section>
    <SectionHeading
      badge={{ label: "No stack required", color: "green" }}
      color="teal"
      icon={<IconChartBar size={14} />}
      title="Stats"
    />
    <Space h="sm" />
    <Text>
      Track your progress over time. The Stats page includes overview cards, an
      accuracy trend chart (color-coded and filterable by mode), a per-stack
      breakdown table, and paginated session history. All data is stored locally
      in your browser.
    </Text>
    <Space h="xs" />
    <Anchor component={Link} to="/stats">
      Go to Stats
    </Anchor>
  </section>
);
