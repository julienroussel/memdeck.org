import '@mantine/core/styles.css';

import {
  Switch,
  useMantineColorScheme,
  AppShell,
  Burger,
  Group,
  Image,
  Text,
  NavLink,
  ScrollArea,
} from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import {
  IconChevronRight,
  IconHome2,
  IconSchool,
  IconMoonStars,
  IconSun,
} from '@tabler/icons-react';
import ReactGA from 'react-ga4';
import { HashRouter, Link } from 'react-router';

import { NavBarFooter } from './NavBarFooter';
import { Routes } from './Routes';

import memdeckLogo from '../public/memdeck.png';

ReactGA.initialize('G-36CZ6GEMKQ');

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const { setColorScheme, colorScheme } = useMantineColorScheme();
  const [stack] = useLocalStorage({
    key: 'stack',
    defaultValue: '',
  });

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
              <Text c="#2a2a2a" fw={700} tt="uppercase">
                MemDeck
              </Text>
            </Group>
            <Group>
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
        <HashRouter>
          <AppShell.Navbar p="md">
            <AppShell.Section grow component={ScrollArea}>
              <NavLink
                component={Link}
                to="/"
                label="Home"
                onClick={() => close()}
                onClickCapture={() => close()}
                leftSection={<IconHome2 size={16} stroke={1.5} />}
                rightSection={
                  <IconChevronRight
                    size={12}
                    stroke={1.5}
                    className="mantine-rotate-rtl"
                  />
                }
              />
              <NavLink
                component={Link}
                disabled={stack === ''}
                to="/quiz"
                label="Quiz"
                onClick={close}
                leftSection={<IconSchool size={16} stroke={1.5} />}
                rightSection={
                  <IconChevronRight
                    size={12}
                    stroke={1.5}
                    className="mantine-rotate-rtl"
                  />
                }
              />
            </AppShell.Section>
            <AppShell.Section>
              <NavBarFooter />
            </AppShell.Section>
          </AppShell.Navbar>
          <AppShell.Main>
            <Routes />
          </AppShell.Main>
        </HashRouter>
      </AppShell>
    </>
  );
};
