import { Title, Text, Space, Anchor } from '@mantine/core';
import { usePageTracking } from '../hooks/usePageTracking';
import { StackPicker } from '../components/StackPicker';
import { useLocalStorage } from '@mantine/hooks';
import { stacks } from '../types/stacks';
import { GITHUB_URL, SELECTED_STACK_LOCAL_STORAGE_KEY } from '../constants';
import { Ribbon } from '../components/Ribbon';

export const Home = () => {
  const [stack] = useLocalStorage({
    key: SELECTED_STACK_LOCAL_STORAGE_KEY,
    defaultValue: '',
  });

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
          <Ribbon stack={[...stacks[stack].order]} />
        </>
      )}
    </div>
  );
};
