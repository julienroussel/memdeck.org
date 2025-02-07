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
    title: 'Mnemonica',
    author: 'Juan Tamariz',
    description:
      'The definitive work on the Mnemonica stack with tricks, principles, and deep theories.',
    link: 'https://www.vanishingincmagic.com/card-magic/mnemonica/',
    category: 'book',
  },
  {
    title: 'The Aronson Approach',
    author: 'Simon Aronson',
    description:
      'Introduces the Aronson Stack, its applications, and several powerful routines.',
    link: 'https://www.vanishingincmagic.com/card-magic/the-aronson-approach/',
    category: 'book',
  },
  {
    title: 'Online Course: Mastering Memorization',
    author: '',
    description:
      'Enroll in this comprehensive online course to master the art of memorizing decks quickly.',
    link: '',
    category: 'book',
  },
  {
    title: 'Community Forum',
    author: '',
    description:
      'Join a community of memory enthusiasts to exchange tips, strategies, and experiences.',
    link: 'https://example.com/forum',
    category: 'book',
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
            <Group>
              <Title order={3}>{resource.title}</Title>

              <Badge color="blue" variant="light">
                {resource.category}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" fs="italic" mb="xs">
              {resource.author}
            </Text>
            <Text size="sm" c="dimmed" mb="md">
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
