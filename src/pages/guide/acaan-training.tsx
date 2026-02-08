import { Anchor, Space, Text } from "@mantine/core";
import { IconNumber } from "@tabler/icons-react";
import { Link } from "react-router";
import { SectionHeading } from "./section-heading";

export const AcaanTraining = () => (
  <section>
    <SectionHeading
      badge={{ label: "Requires stack" }}
      color="violet"
      icon={<IconNumber size={14} />}
      title="ACAAN Training"
    />
    <Space h="sm" />
    <Text>
      ACAAN stands for "Any Card At Any Number" — a classic effect where a
      spectator names any card and any number, and the card is found at that
      exact position in the deck.
    </Text>
    <Space h="sm" />
    <Text>
      In this mode, you're shown a card and a target position. Your job is to
      calculate the cut depth needed to move the card to that position. Enter a
      value from 0 to 51. Timer and session options work the same as Flashcard
      mode.
    </Text>
    <Space h="xs" />
    <Anchor component={Link} to="/acaan">
      Go to ACAAN Training
    </Anchor>
  </section>
);
