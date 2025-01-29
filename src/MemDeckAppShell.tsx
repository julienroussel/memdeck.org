import { AppShell, Burger, Group, Image, Skeleton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useMemo, useCallback } from 'react';
import { Effect } from 'effect';
import viteLogo from '/vite.svg';

export const MemDeckAppShell = () => {
  const [opened, { toggle }] = useDisclosure();

  const [count, setCount] = useState(0);

  const task = useMemo(
    () => Effect.sync(() => setCount((current) => current + 1)),
    [setCount],
  );

  const increment = useCallback(() => Effect.runSync(task), [task]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Image radius="md" h={30} w="auto" fit="contain" src={viteLogo} />
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
      <AppShell.Main>
        <button onClick={increment}>{count}</button>
      </AppShell.Main>
    </AppShell>
  );
};
