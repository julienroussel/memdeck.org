import { IconChevronRight, IconHome2, IconSchool } from '@tabler/icons-react';
import { AppShell, NavLink, ScrollArea } from '@mantine/core';
import { Link } from 'react-router';
import { NavBarFooter } from './NavBarFooter';

export const NavBar = () => (
  <AppShell.Navbar p="md">
    <AppShell.Section grow component={ScrollArea}>
      <Link to="/" style={{ color: 'inherit', textDecoration: 'inherit' }}>
        <NavLink
          href="#required-for-focus"
          label="Home"
          leftSection={<IconHome2 size={16} stroke={1.5} />}
          rightSection={
            <IconChevronRight
              size={12}
              stroke={1.5}
              className="mantine-rotate-rtl"
            />
          }
        />
      </Link>
      <Link to="/quiz" style={{ color: 'inherit', textDecoration: 'inherit' }}>
        <NavLink
          href="#required-for-focus"
          label="Quiz"
          leftSection={<IconSchool size={16} stroke={1.5} />}
          rightSection={
            <IconChevronRight
              size={12}
              stroke={1.5}
              className="mantine-rotate-rtl"
            />
          }
        />
      </Link>
    </AppShell.Section>
    <AppShell.Section>
      <NavBarFooter />
    </AppShell.Section>
  </AppShell.Navbar>
);
