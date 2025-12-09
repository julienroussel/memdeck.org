import { Title, Text, Space, Anchor, Grid } from '@mantine/core';
import { usePageTracking } from '../hooks/usePageTracking';
import { StackPicker } from '../components/StackPicker';
import { GITHUB_URL } from '../constants';
import { CardSpread } from '../components/CardSpread/CardSpread';
import { useSelectedStack } from '../hooks/useSelectedStack';

export const Home = () => {
  const { stackKey, stack, stackName } = useSelectedStack();

  usePageTracking();

  return (
    <div className="fullMantineContainerHeight">
      <Grid
        gutter={0}
        overflow="hidden"
        style={{
          display: 'grid',
          height: '100%',
        }}
      >
        <Grid.Col span={12}>
          <Title order={2}>Welcome to MemDeck</Title>
          <Space h="lg" />
          <Text>
            Hope these tools help you level up your memorized deck stack
            learning. Need a hand or think something's missing? Hit me up on{' '}
            <Anchor href={GITHUB_URL} target="_blank" underline="never">
              Github
            </Anchor>
            !
          </Text>
          {stackKey === '' && (
            <>
              <Space h="lg" />
              <Text>
                Hey there, first-timer! Pick your favorite memorized deck stack
                below to unlock all the cool features. You can switch it up
                anytime using the selector at the bottom of the menu.
              </Text>
              <Space h="lg" />
              <StackPicker />
            </>
          )}
        </Grid.Col>
        <Grid.Col span={12} style={{ height: '100%' }}>
          {stackKey !== '' && (
            <>
              <Space h="lg" />
              <Text>
                Your selected stack is{' '}
                <Text span fw={700}>
                  {stackName}
                </Text>
              </Text>
              <Space h="lg" />{' '}
              <CardSpread items={[...stack.order]} degree={0.5} />
            </>
          )}
        </Grid.Col>
      </Grid>
    </div>
  );
};
