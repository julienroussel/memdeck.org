import { NavLink, Tooltip } from "@mantine/core";
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

const DISABLED_TOOLTIP = "Select a stack first";

export const NavLinks = ({ onClick }: { onClick: () => void }) => {
  const { stackKey } = useSelectedStack();
  const location = useLocation();
  const isDisabled = stackKey === "";

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
        <Tooltip
          disabled={!isDisabled}
          label={DISABLED_TOOLTIP}
          position="right"
        >
          <NavLink
            active={location.pathname === "/flashcard"}
            component={Link}
            disabled={isDisabled}
            label="Flashcard"
            leftSection={<IconPlayCardStar size={16} stroke={1.5} />}
            onClick={onClick}
            to="/flashcard"
          />
        </Tooltip>
        <Tooltip
          disabled={!isDisabled}
          label={DISABLED_TOOLTIP}
          position="right"
        >
          <NavLink
            active={location.pathname === "/shuffle"}
            component={Link}
            disabled={isDisabled}
            label="Shuffle"
            leftSection={<IconArrowsShuffle size={16} stroke={1.5} />}
            onClick={onClick}
            to="/shuffle"
          />
        </Tooltip>
        <Tooltip
          disabled={!isDisabled}
          label={DISABLED_TOOLTIP}
          position="right"
        >
          <NavLink
            active={location.pathname === "/acaan"}
            component={Link}
            disabled={isDisabled}
            label="ACAAN"
            leftSection={<IconNumber size={16} stroke={1.5} />}
            onClick={onClick}
            to="/acaan"
          />
        </Tooltip>
        <Tooltip
          disabled={!isDisabled}
          label={DISABLED_TOOLTIP}
          position="right"
        >
          <NavLink
            active={location.pathname === "/toolbox"}
            component={Link}
            disabled={isDisabled}
            label="Toolbox"
            leftSection={<IconTools size={16} stroke={1.5} />}
            onClick={onClick}
            to="/toolbox"
          />
        </Tooltip>
      </NavLink>
    </>
  );
};
