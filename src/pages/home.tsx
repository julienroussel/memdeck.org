import { Anchor, Grid, Space, Text, Title } from "@mantine/core";
import { CardSpread } from "../components/card-spread/card-spread";
import { GITHUB_URL } from "../constants";
import { useSelectedStack } from "../hooks/use-selected-stack";

export const Home = () => {
  const { stack, stackName } = useSelectedStack();

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
            learning. Need a hand or think something's missing? Hit me up on{" "}
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
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }}>
          <Space h="lg" />
          <Text>
            Your selected stack is{" "}
            <Text fw={700} span>
              {stackName}
            </Text>
          </Text>
          <Space h="lg" />
          <CardSpread degree={0.5} items={[...stack.order]} />
        </Grid.Col>
      </Grid>
    </div>
  );
};
