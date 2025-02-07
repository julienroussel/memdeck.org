import {
  Anchor,
  Badge,
  Card,
  Group,
  List,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { GITHUB_URL } from '../constants';
import { IconExternalLink } from '@tabler/icons-react';

const resources = [
  {
    title: 'Beginner Guide to Memorizing a Deck',
    description:
      'An introductory guide covering basic techniques and methods for memorizing a deck of cards.',
    link: 'https://example.com/beginner-guide',
    category: 'Guide',
  },
  {
    title: 'Advanced Memory Techniques',
    description:
      'Explore advanced strategies and mnemonic devices to boost your card memorization skills.',
    link: 'https://example.com/advanced-memory',
    category: 'Tutorial',
  },
  {
    title: 'Online Course: Mastering Memorization',
    description:
      'Enroll in this comprehensive online course to master the art of memorizing decks quickly.',
    link: 'https://example.com/memorization-course',
    category: 'Course',
  },
  {
    title: 'Community Forum',
    description:
      'Join a community of memory enthusiasts to exchange tips, strategies, and experiences.',
    link: 'https://example.com/forum',
    category: 'Community',
  },
];

const secondaryResources = [
  {
    title: 'Memory Palace Technique',
    link: 'https://example.com/memory-palace',
  },
  {
    title: 'Speed Memorization Tips',
    link: 'https://example.com/speed-memorization',
  },
  {
    title: 'Interactive Memory Games',
    link: 'https://example.com/memory-games',
  },
  {
    title: 'Memory Training Podcast',
    link: 'https://example.com/memory-podcast',
  },
];

export const Resources = () => {
  return (
    <>
      <Title order={1} mb="md">
        Memorized Deck Resources
      </Title>
      <Text mb="xl">
        Explore a curated collection of resources to help you master the art of
        memorizing decks. Missing a resource? Give me a shout or drop a pull
        request on{' '}
        <Anchor href={GITHUB_URL} target="_blank" underline="never">
          Github
        </Anchor>
        .
      </Text>
      <SimpleGrid cols={2} spacing="lg">
        {resources.map((resource, index) => (
          <Card key={index} shadow="sm" padding="lg" radius="md" withBorder>
            <Group mb="xs">
              <Title order={3}>{resource.title}</Title>
              <Badge color="blue" variant="light">
                {resource.category}
              </Badge>
            </Group>
            <Text size="sm" color="dimmed" mb="md">
              {resource.description}
            </Text>
            <Anchor href={resource.link} target="_blank" size="sm">
              Learn more
            </Anchor>
          </Card>
        ))}
      </SimpleGrid>

      {/* Secondary Resources Section */}
      <Title order={2} mt="xl" mb="md">
        Secondary Resources
      </Title>
      <List
        spacing="sm"
        size="md"
        center
        icon={
          <ThemeIcon color="blue" size={24} radius="xl">
            <IconExternalLink size={16} />
          </ThemeIcon>
        }
      >
        {secondaryResources.map((resource, index) => (
          <List.Item key={index}>
            <Anchor href={resource.link} target="_blank">
              {resource.title}
            </Anchor>
          </List.Item>
        ))}
      </List>
    </>
  );
};
