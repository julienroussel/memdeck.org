import '@mantine/core/styles.css';

import {
  Switch,
  useMantineColorScheme,
  AppShell,
  Burger,
  Group,
  Image,
  Text,
  ScrollArea,
  ActionIcon,
  Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconMoonStars, IconSun, IconBrandGithub } from '@tabler/icons-react';
import ReactGA from 'react-ga4';

import { StackPicker } from './components/StackPicker';
import { Routes } from './Routes';

// eslint-disable-next-line import/no-unresolved
import memdeckLogo from '/memdeck.png';
import { Help } from './components/Help';
import { GITHUB_URL } from './constants';
import { NavLinks } from './components/NavLinks';

ReactGA.initialize('G-36CZ6GEMKQ');

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  return (
    <>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
              />
              <Image
                radius="md"
                h={30}
                w="auto"
                fit="contain"
                src={memdeckLogo}
              />
              <Anchor href="/" underline="never">
                <Text c="#2a2a2a" fw={700} tt="uppercase">
                  MemDeck{' '}
                </Text>
              </Anchor>
            </Group>
            <Group>
              <Help />
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Github"
                component="a"
                target="_blank"
                href={GITHUB_URL}
              >
                <IconBrandGithub />
              </ActionIcon>
              <Switch
                size="md"
                color="dark.4"
                onLabel={
                  <IconSun size={16} color="var(--mantine-color-yellow-4)" />
                }
                offLabel={
                  <IconMoonStars
                    size={16}
                    color="var(--mantine-color-blue-6)"
                  />
                }
                checked={colorScheme === 'light'}
                onChange={(event) =>
                  setColorScheme(event.currentTarget.checked ? 'light' : 'dark')
                }
              />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AppShell.Section grow component={ScrollArea}>
            <NavLinks onClick={close} />
          </AppShell.Section>
          <AppShell.Section>
            <StackPicker />
          </AppShell.Section>
        </AppShell.Navbar>
        <AppShell.Main>
          <Routes />
        </AppShell.Main>
      </AppShell>
    </>
  );
};
