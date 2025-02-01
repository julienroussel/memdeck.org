import { Title, Text, Paper, Space } from '@mantine/core';
import { usePageTracking } from '../hooks/usePageTracking';

export const Home = () => {
  usePageTracking();

  return (
    <div>
      <Title order={1}>What is MemDeck?</Title>
      <Space h="lg" />
      <Paper shadow="xs" p="xl">
        <Text>
          MemDeck is a simple yet effective tool designed to help anyone master
          a memorized deck of cards. Whether you're a magician, a memory
          enthusiast, or just curious about the art of memorization, MemDeck
          provides straightforward exercises to train and test your knowledge.
        </Text>
      </Paper>
    </div>
  );
};
