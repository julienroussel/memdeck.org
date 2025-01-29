import { AppShell, Burger, Group, Image, Skeleton, Text } from '@mantine/core';
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
        Navbar
        {Array(15)
          .fill(0)
          .map((_, index) => (
            <Skeleton key={index} h={28} mt="sm" animate={false} />
          ))}
      </AppShell.Navbar>
      <AppShell.Main></AppShell.Main>
    </AppShell>
  );
};
