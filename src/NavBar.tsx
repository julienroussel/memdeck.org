import { IconChevronRight, IconHome2, IconSchool } from '@tabler/icons-react';
import { AppShell, NavLink, ScrollArea } from '@mantine/core';
import { Link } from 'react-router';
import { NavBarFooter } from './NavBarFooter';
import { useDisclosure } from '@mantine/hooks';

export const NavBar = () => {
  const [_, { close }] = useDisclosure();

  return (
    <AppShell.Navbar p="md">
      <AppShell.Section grow component={ScrollArea}>
        <NavLink
          component={Link}
          to="/"
          label="Home"
          onClick={close}
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
  );
};
