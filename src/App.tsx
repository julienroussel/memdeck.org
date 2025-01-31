import '@mantine/core/styles.css';

import { MantineProvider, ColorSchemeScript, Switch } from '@mantine/core';
import { AppShell, Burger, Group, Image, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter } from 'react-router';

import { Routes } from './Routes';
import { NavBar } from './NavBar';

import memdeckLogo from '/memdeck.png';
import { IconMoonStars, IconSun } from '@tabler/icons-react';

export const App = () => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider defaultColorScheme="light">
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
                />
              </Group>
            </Group>
          </AppShell.Header>
          <BrowserRouter>
            <NavBar />
            <AppShell.Main>
              <Routes />
            </AppShell.Main>
          </BrowserRouter>
        </AppShell>
      </MantineProvider>
    </>
  );
};
