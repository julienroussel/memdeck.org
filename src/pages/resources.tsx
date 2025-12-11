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
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { GITHUB_URL } from "../constants";

const primaryResources = [
  {
    title: "Mnemonica",
    author: "Juan Tamariz",
    description:
      "The definitive work on the Mnemonica stack with tricks, principles, and deep theories.",
    link: "https://www.vanishingincmagic.com/card-magic/mnemonica/",
    category: "book",
  },
  {
    title: "The Aronson Approach",
    author: "Simon Aronson",
    description:
      "Introduces the Aronson Stack, its applications, and several powerful routines.",
    link: "https://www.vanishingincmagic.com/card-magic/the-aronson-approach/",
    category: "book",
  },
  {
    title: "Bound to Please",
    author: "Simon Aronson",
    description:
      "Compilation of Aronson’s early works, essential for stack work.",
    link: "https://www.vanishingincmagic.com/card-magic/bound-to-please/",
    category: "book",
  },
  {
    title: "Memories Are Made of This",
    author: "Simon Aronson",
    description:
      "A shorter work that provides practical applications for the memorized deck.",
    link: "http://simonaronson.com/Memories%20Are%20Made%20of%20This.pdf",
    category: "pdf",
  },
];

const otherResources = [
  {
    title: "The Magic Rainbow",
    author: "Juan Tamariz",
    link: "https://www.vanishingincmagic.com/magic-theory/tamariz-magic-rainbow/",
    description:
      "Not just about memorized decks, but essential for deepening magical thinking.",
  },
  {
    title: "In Order To Amaze",
    author: "Pit Hartling",
    link: "https://pithartling.com/shop/#in-order-to-amaze",
    description:
      "Brilliant routines and effects with memorized deck techniques",
  },
  {
    title: "Memorandum",
    author: "Woody Aragón",
    link: "https://www.vanishingincmagic.com/card-magic/memorandum/",
    description:
      "Unique memorized deck with powerful effects and deep insights.",
  },
  {
    title: "Temporarily Out of Order",
    author: "Patrick Redford",
    link: "https://www.murphysmagic.com/product.aspx?id=59497",
    description:
      "A deep dive into the Redford stack with versatile routines and stack-independent principles.",
  },
  {
    title: "Applesauce",
    author: "Patrick Redford",
    link: "https://patrickredford.com/product/applesauce/",
    description:
      "Expands on the Redford stack with new effects, ideas, and applications for stack work.",
  },
  {
    title: "Sleightly Out of Order",
    author: "Patrick Redford",
    link: "https://patrickredford.com/product/sleightly-out-of-order/",
    description:
      "Advanced techniques and effects using a memorized stack with sleight-of-hand integrations.",
  },
  {
    title: "Particle System",
    author: "Joshua Jay",
    link: "https://www.vanishingincmagic.com/magic-books/particle-system/",
    description:
      "New memorized deck that allows magicians to cut to any named card without looking, featuring built-in benefits and a variety of powerful routines.",
  },
];

export const Resources = () => (
  <>
    <Title mb="md" order={1}>
      Memorized Deck Resources
    </Title>
    <Text mb="xl">
      Explore a curated collection of resources to help you master the art of
      memorized decks. Missing a resource? Give me a shout or drop a pull
      request on{" "}
      <Anchor href={GITHUB_URL} target="_blank" underline="never">
        Github
      </Anchor>
      .
    </Text>
    <SimpleGrid cols={2} spacing="lg">
      {primaryResources.map((resource) => (
        <Card
          key={resource.title}
          padding="lg"
          radius="md"
          shadow="sm"
          withBorder
        >
          <Group>
            <Title order={3}>{resource.title}</Title>
            <Badge color="blue" variant="light">
              {resource.category}
            </Badge>
          </Group>
          <Text c="dimmed" fs="italic" mb="xs" size="sm">
            {resource.author}
          </Text>
          <Text c="dimmed" mb="md" size="sm">
            {resource.description}
          </Text>
          <Anchor href={resource.link} size="sm" target="_blank">
            Learn more
          </Anchor>
        </Card>
      ))}
    </SimpleGrid>

    <Title mb="md" mt="xl" order={2}>
      Other Resources
    </Title>
    <List
      center
      icon={
        <ThemeIcon color="blue" radius="xl" size={24}>
          <IconExternalLink size={16} />
        </ThemeIcon>
      }
      size="md"
      spacing="sm"
    >
      {otherResources.map((resource) => (
        <List.Item key={resource.title}>
          <Anchor href={resource.link} target="_blank">
            {resource.title}
          </Anchor>{" "}
          (
          <Text c="dimmed" fs="italic" size="sm" span>
            {resource.author}
          </Text>
          ) : <Text span>{resource.description}</Text>
        </List.Item>
      ))}
    </List>
  </>
);
