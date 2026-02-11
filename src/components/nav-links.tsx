import { NavLink, Tooltip } from "@mantine/core";
import {
  IconBook2,
  IconChartBar,
  IconExternalLink,
  IconHome2,
  IconNumber,
  IconPlayCardStar,
  IconTools,
} from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { useSelectedStack } from "../hooks/use-selected-stack";

export const NavLinks = memo(function NavLinks({
  onClick,
}: {
  onClick: () => void;
}) {
  const { stackKey } = useSelectedStack();
  const location = useLocation();
  const isDisabled = stackKey === "";
  const { t } = useTranslation();

  const disabledTooltip = t("nav.disabledTooltip");

  return (
    <>
      <NavLink
        active={location.pathname === "/"}
        component={Link}
        label={t("nav.home")}
        leftSection={<IconHome2 size={16} stroke={1.5} />}
        onClick={onClick}
        to="/"
      />
      <NavLink
        active={location.pathname === "/guide"}
        component={Link}
        label={t("nav.guide")}
        leftSection={<IconBook2 size={16} stroke={1.5} />}
        onClick={onClick}
        to="/guide"
      />
      <NavLink
        active={location.pathname === "/resources"}
        component={Link}
        label={t("nav.resources")}
        leftSection={<IconExternalLink size={16} stroke={1.5} />}
        onClick={onClick}
        to="/resources"
      />
      <NavLink
        active={location.pathname === "/stats"}
        component={Link}
        label={t("nav.stats")}
        leftSection={<IconChartBar size={16} stroke={1.5} />}
        onClick={onClick}
        to="/stats"
      />

      <NavLink
        defaultOpened
        label={t("nav.tools")}
        leftSection={<IconTools size={16} stroke={1.5} />}
      >
        <Tooltip
          disabled={!isDisabled}
          label={disabledTooltip}
          position="right"
        >
          <NavLink
            active={location.pathname === "/flashcard"}
            component={Link}
            disabled={isDisabled}
            label={t("nav.flashcard")}
            leftSection={<IconPlayCardStar size={16} stroke={1.5} />}
            onClick={onClick}
            to="/flashcard"
          />
        </Tooltip>
        <Tooltip
          disabled={!isDisabled}
          label={disabledTooltip}
          position="right"
        >
          <NavLink
            active={location.pathname === "/acaan"}
            component={Link}
            disabled={isDisabled}
            label={t("nav.acaan")}
            leftSection={<IconNumber size={16} stroke={1.5} />}
            onClick={onClick}
            to="/acaan"
          />
        </Tooltip>
        <Tooltip
          disabled={!isDisabled}
          label={disabledTooltip}
          position="right"
        >
          <NavLink
            active={location.pathname === "/toolbox"}
            component={Link}
            disabled={isDisabled}
            label={t("nav.toolbox")}
            leftSection={<IconTools size={16} stroke={1.5} />}
            onClick={onClick}
            to="/toolbox"
          />
        </Tooltip>
      </NavLink>
    </>
  );
});
