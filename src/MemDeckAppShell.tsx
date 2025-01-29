import { IconChevronRight, IconSchool } from '@tabler/icons-react';
import { AppShell, Burger, Group, Image, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import memdeckLogo from '/memdeck.png';

export const MemDeckAppShell = () => {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Image radius="md" h={30} w="auto" fit="contain" src={memdeckLogo} />
          <Text c="#2a2a2a" fw={700} tt="uppercase">
            MemDeck
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <NavLink
          href="#required-for-focus"
          label="Train"
          leftSection={<IconSchool size={16} stroke={1.5} />}
          rightSection={
            <IconChevronRight
              size={12}
              stroke={1.5}
              className="mantine-rotate-rtl"
            />
          }
          variant="subtle"
          active
        />
      </AppShell.Navbar>
      <AppShell.Main></AppShell.Main>
    </AppShell>
  );
};
