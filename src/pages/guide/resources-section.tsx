import { Anchor, Space, Text } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const ResourcesSection = () => (
  <section>
    <SectionHeading
      color="orange"
      icon={<IconExternalLink size={14} />}
      title="Resources"
    />
    <Space h="sm" />
    <Text>
      A curated collection of books and PDFs on memorized deck theory, routines,
      and practice techniques from leading authors in the field.
    </Text>
    <Space h="xs" />
    <Anchor component={Link} to="/resources">
      Browse Resources
    </Anchor>
  </section>
);
