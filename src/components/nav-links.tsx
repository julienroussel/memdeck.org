import { NavLink } from "@mantine/core";
import {
  IconArrowsShuffle,
  IconExternalLink,
  IconHome2,
  IconNumber,
  IconPlayCardStar,
  IconTools,
} from "@tabler/icons-react";
import { Link, useLocation } from "react-router";
import { useSelectedStack } from "../hooks/use-selected-stack";

export const NavLinks = ({ onClick }: { onClick: () => void }) => {
  const { stackKey } = useSelectedStack();
  const location = useLocation();

  return (
    <>
      <NavLink
        active={location.pathname === "/"}
        component={Link}
        label="Home"
        leftSection={<IconHome2 size={16} stroke={1.5} />}
        onClick={onClick}
        to="/"
      />
      <NavLink
        active={location.pathname === "/resources"}
        component={Link}
        label="Resources"
        leftSection={<IconExternalLink size={16} stroke={1.5} />}
        onClick={onClick}
        to="/resources"
      />

      <NavLink
        defaultOpened
        label="Tools"
        leftSection={<IconTools size={16} stroke={1.5} />}
      >
        <NavLink
          active={location.pathname === "/flashcard"}
          component={Link}
          disabled={stackKey === ""}
          label="Flashcard"
          leftSection={<IconPlayCardStar size={16} stroke={1.5} />}
          onClick={onClick}
          to="/flashcard"
        />
        <NavLink
          active={location.pathname === "/shuffle"}
          component={Link}
          disabled={stackKey === ""}
          label="Shuffle"
          leftSection={<IconArrowsShuffle size={16} stroke={1.5} />}
          onClick={onClick}
          to="/shuffle"
        />
        <NavLink
          active={location.pathname === "/acaan"}
          component={Link}
          disabled={stackKey === ""}
          label="ACAAN"
          leftSection={<IconNumber size={16} stroke={1.5} />}
          onClick={onClick}
          to="/acaan"
        />
        <NavLink
          active={location.pathname === "/toolbox"}
          component={Link}
          disabled={stackKey === ""}
          label="Toolbox"
          leftSection={<IconTools size={16} stroke={1.5} />}
          onClick={onClick}
          to="/toolbox"
        />
      </NavLink>
    </>
  );
};
