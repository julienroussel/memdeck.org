import {
  Anchor,
  Card,
  Grid,
  Group,
  Space,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBook2 } from "@tabler/icons-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { CardSpread } from "../components/card-spread/card-spread";
import { StackPicker } from "../components/stack-picker";
import { GITHUB_URL } from "../constants";
import { useDocumentMeta } from "../hooks/use-document-meta";
import { useSelectedStack } from "../hooks/use-selected-stack";
import { cardItems } from "../types/typeguards";

export const Home = () => {
  useDocumentMeta({
    title: "MemDeck — Mastering memorized deck",
    description:
      "Free online tool for mastering memorized deck systems like Mnemonica, Aronson, Memorandum, Redford, and Particle.",
  });
  const { stackKey, stack, stackName } = useSelectedStack();

  const stackCards = useMemo(
    () => (stack ? cardItems([...stack.order]) : null),
    [stack]
  );

  return (
    <div className="fullMantineContainerHeight">
      <Grid
        gutter={0}
        overflow="hidden"
        style={{
          display: "grid",
          height: "100%",
        }}
      >
        <Grid.Col span={12}>
          <Title order={2}>Welcome to MemDeck</Title>
          <Space h="lg" />
          <Text>
            Hope these tools help you level up your memorized deck stack
            learning. Check out the{" "}
            <Anchor component={Link} to="/guide">
              guide
            </Anchor>{" "}
            for a walkthrough of everything MemDeck offers. Need a hand or think
            something's missing? Hit me up on{" "}
            <Anchor
              href={GITHUB_URL}
              rel="noopener"
              target="_blank"
              underline="never"
            >
              Github
            </Anchor>
            !
          </Text>
          {stackKey === "" && (
            <>
              <Space h="lg" />
              <Text>
                Hey there, first-timer! Pick your favorite memorized deck stack
                below to unlock all the cool features. You can switch it up
                anytime using the selector at the bottom of the menu.
              </Text>
              <Space h="lg" />
              <StackPicker />
              <Space h="lg" />
              <Card
                aria-label="Read the MemDeck guide"
                component={Link}
                padding="lg"
                radius="md"
                shadow="sm"
                td="none"
                to="/guide"
                withBorder
              >
                <Group>
                  <ThemeIcon
                    aria-hidden="true"
                    color="blue"
                    radius="xl"
                    size="lg"
                    variant="light"
                  >
                    <IconBook2 size={20} stroke={1.5} />
                  </ThemeIcon>
                  <Stack gap={4}>
                    <Text fw={600}>New here? Read the Guide</Text>
                    <Text c="dimmed" size="sm">
                      Learn about all the training modes and how to get the most
                      out of MemDeck.
                    </Text>
                  </Stack>
                </Group>
              </Card>
            </>
          )}
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }}>
          {stackKey !== "" && stackCards && (
            <>
              <Space h="lg" />
              <Text>
                Your selected stack is{" "}
                <Text fw={700} span>
                  {stackName}
                </Text>
              </Text>
              <Space h="lg" />
              <CardSpread degree={0.5} items={stackCards} />
            </>
          )}
        </Grid.Col>
      </Grid>
    </div>
  );
};
