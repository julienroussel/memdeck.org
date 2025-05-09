import { NavLink } from '@mantine/core';
import {
  IconArrowsShuffle,
  IconExternalLink,
  IconHome2,
  IconNumber,
  IconPlayCardStar,
  IconTools,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router';
import { SELECTED_STACK_LSK } from '../constants';
import { useLocalDb } from '../utils/localstorage';

export const NavLinks = ({ onClick }: { onClick: () => void }) => {
  const [stack] = useLocalDb(SELECTED_STACK_LSK);
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
          leftSection={<IconPlayCardStar size={16} stroke={1.5} />}
          active={location.pathname === '/flashcard'}
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
        <NavLink
          component={Link}
          disabled={stack === ''}
          to="/toolbox"
          label="Toolbox"
          onClick={onClick}
          leftSection={<IconTools size={16} stroke={1.5} />}
          active={location.pathname === '/toolbox'}
        />
      </NavLink>
    </>
  );
};
