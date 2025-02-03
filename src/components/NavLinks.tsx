import { NavLink } from '@mantine/core';
import {
  IconArrowsShuffle,
  IconExternalLink,
  IconHome2,
  IconMenuOrder,
  IconNumber,
  IconSchool,
  IconTools,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router';
import { SELECTED_STACK_LOCAL_STORAGE_KEY } from '../constants';
import { useLocalStorage } from '@mantine/hooks';

export const NavLinks = ({ onClick }: { onClick: () => void }) => {
  const [stack] = useLocalStorage({
    key: SELECTED_STACK_LOCAL_STORAGE_KEY,
    defaultValue: '',
  });
  const location = useLocation();

  return (
    <>
      <NavLink
        component={Link}
        to="/"
        label="Home"
        onClick={onClick}
        leftSection={<IconHome2 size={16} stroke={1.5} />}
        active={location.pathname === '/'}
      />
      <NavLink
        component={Link}
        to="/resources"
        label="Resources"
        onClick={onClick}
        leftSection={<IconExternalLink size={16} stroke={1.5} />}
        active={location.pathname === '/resources'}
      />

      <NavLink
        label="Tools"
        leftSection={<IconTools size={16} stroke={1.5} />}
        defaultOpened
      >
        <NavLink
          component={Link}
          disabled={stack === ''}
          to="/flashcard"
          label="Flashcard"
          onClick={onClick}
          leftSection={<IconSchool size={16} stroke={1.5} />}
          active={location.pathname === '/flashcard'}
        />
        <NavLink
          component={Link}
          disabled={stack === ''}
          to="/nextprevious"
          label="Next / Previous"
          onClick={onClick}
          leftSection={<IconMenuOrder size={16} stroke={1.5} />}
          active={location.pathname === '/nextprevious'}
        />
        <NavLink
          component={Link}
          disabled={stack === ''}
          to="/shuffle"
          label="Shuffle"
          onClick={onClick}
          leftSection={<IconArrowsShuffle size={16} stroke={1.5} />}
          active={location.pathname === '/shuffle'}
        />
        <NavLink
          component={Link}
          disabled={stack === ''}
          to="/acaan"
          label="ACAAN"
          onClick={onClick}
          leftSection={<IconNumber size={16} stroke={1.5} />}
          active={location.pathname === '/acaan'}
        />
      </NavLink>
    </>
  );
};
