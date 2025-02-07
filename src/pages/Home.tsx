import { Title, Text, Space, Anchor } from '@mantine/core';
import { usePageTracking } from '../hooks/usePageTracking';
import { StackPicker } from '../components/StackPicker';
import { stacks } from '../types/stacks';
import { GITHUB_URL, SELECTED_STACK_LSK } from '../constants';
import { CardSpread } from '../components/CardSpread/CardSpread';
import { useLocalDb } from '../utils/localstorage';

export const Home = () => {
  const [stack] = useLocalDb(SELECTED_STACK_LSK);

  usePageTracking();

  return (
    <div>
      <Title order={2}>Welcome to MemDeck</Title>
      <Space h="lg" />
      <Text>
        Hope these tools help you level up your memorized deck stack learning.
        Need a hand or think something's missing? Hit me up on{' '}
        <Anchor href={GITHUB_URL} target="_blank" underline="never">
          Github
        </Anchor>
        !
      </Text>
      {stack === '' && (
        <>
          <Space h="lg" />
          <Text>
            Hey there, first-timer! Pick your favorite memorized deck stack
            below to unlock all the cool features. You can switch it up anytime
            using the selector at the bottom of the menu.
          </Text>
          <Space h="lg" />
          <StackPicker />
        </>
      )}
      {stack !== '' && (
        <>
          <Space h="lg" />
          <Text>
            Your selected stack is{' '}
            <Text span fw={700}>
              {stacks[stack]?.name}
            </Text>
          </Text>
          <Space h="lg" />
          <CardSpread items={[...stacks[stack].order]} degree={0.5} />
        </>
      )}
    </div>
  );
};
