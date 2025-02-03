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
  IconHome2,
  IconSchool,
  IconMoonStars,
  IconSun,
  IconArrowsShuffle,
  IconMenuOrder,
  IconNumber,
} from '@tabler/icons-react';
import ReactGA from 'react-ga4';
import { Link, useLocation } from 'react-router';

import { NavBarFooter } from './NavBarFooter';
import { Routes } from './Routes';

// eslint-disable-next-line import/no-unresolved
import memdeckLogo from '/memdeck.png';

ReactGA.initialize('G-36CZ6GEMKQ');

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const { setColorScheme, colorScheme } = useMantineColorScheme();
  const [stack] = useLocalStorage({
    key: 'stack',
    defaultValue: '',
  });
  const location = useLocation();

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

        <AppShell.Navbar p="md">
          <AppShell.Section grow component={ScrollArea}>
            <NavLink
              component={Link}
              to="/"
              label="Home"
              onClick={() => close()}
              onClickCapture={() => close()}
              leftSection={<IconHome2 size={16} stroke={1.5} />}
              active={location.pathname === '/'}
            />
            <NavLink
              component={Link}
              disabled={stack === ''}
              to="/flashcard"
              label="Flashcard"
              onClick={close}
              leftSection={<IconSchool size={16} stroke={1.5} />}
              active={location.pathname === '/flashcard'}
            />
            <NavLink
              component={Link}
              disabled={stack === ''}
              to="/nextprevious"
              label="Next / Previous"
              onClick={close}
              leftSection={<IconMenuOrder size={16} stroke={1.5} />}
              active={location.pathname === '/nextprevious'}
            />
            <NavLink
              component={Link}
              disabled={stack === ''}
              to="/shuffle"
              label="Shuffle"
              onClick={close}
              leftSection={<IconArrowsShuffle size={16} stroke={1.5} />}
              active={location.pathname === '/shuffle'}
            />
            <NavLink
              component={Link}
              disabled={stack === ''}
              to="/acaan"
              label="ACAAN"
              onClick={close}
              leftSection={<IconNumber size={16} stroke={1.5} />}
              active={location.pathname === '/acaan'}
            />
          </AppShell.Section>
          <AppShell.Section>
            <NavBarFooter />
          </AppShell.Section>
        </AppShell.Navbar>
        <AppShell.Main>
          <Routes />
        </AppShell.Main>
      </AppShell>
    </>
  );
};
