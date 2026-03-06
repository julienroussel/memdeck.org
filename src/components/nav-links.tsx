import { NavLink, Tooltip } from "@mantine/core";
import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBook2,
  IconChartBar,
  IconExternalLink,
  IconEyeSearch,
  IconHome2,
  IconInfoCircle,
  IconNumber,
  IconPlayCardStar,
  IconTools,
} from "@tabler/icons-react";
import { type MouseEvent, memo, type ReactNode, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { useSelectedStack } from "../hooks/use-selected-stack";

function DisableableNavLink({
  isDisabled,
  disabledTooltip,
  active,
  label,
  icon: Icon,
  to,
  onClick,
}: {
  isDisabled: boolean;
  disabledTooltip: string;
  active: boolean;
  label: ReactNode;
  icon: TablerIcon;
  to: string;
  onClick: (e: MouseEvent) => void;
}) {
  const leftSection = <Icon size={16} stroke={1.5} />;

  return (
    <Tooltip disabled={!isDisabled} label={disabledTooltip} position="right">
      {isDisabled ? (
        <NavLink
          active={active}
          aria-disabled={true}
          disabled={true}
          label={label}
          leftSection={leftSection}
          tabIndex={-1}
        />
      ) : (
        <NavLink
          active={active}
          component={Link}
          label={label}
          leftSection={leftSection}
          onClick={onClick}
          to={to}
        />
      )}
    </Tooltip>
  );
}

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

  const handleDisabledClick = useCallback(
    (e: MouseEvent) => {
      if (isDisabled) {
        e.preventDefault();
      } else {
        onClick();
      }
    },
    [isDisabled, onClick]
  );

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
        component="button"
        defaultOpened
        label={t("nav.tools")}
        leftSection={<IconTools size={16} stroke={1.5} />}
      >
        <DisableableNavLink
          active={location.pathname === "/flashcard"}
          disabledTooltip={disabledTooltip}
          icon={IconPlayCardStar}
          isDisabled={isDisabled}
          label={t("nav.flashcard")}
          onClick={handleDisabledClick}
          to="/flashcard"
        />
        <DisableableNavLink
          active={location.pathname === "/spot-check"}
          disabledTooltip={disabledTooltip}
          icon={IconEyeSearch}
          isDisabled={isDisabled}
          label={t("nav.spotCheck")}
          onClick={handleDisabledClick}
          to="/spot-check"
        />
        <DisableableNavLink
          active={location.pathname === "/acaan"}
          disabledTooltip={disabledTooltip}
          icon={IconNumber}
          isDisabled={isDisabled}
          label={t("nav.acaan")}
          onClick={handleDisabledClick}
          to="/acaan"
        />
        <DisableableNavLink
          active={location.pathname === "/toolbox"}
          disabledTooltip={disabledTooltip}
          icon={IconTools}
          isDisabled={isDisabled}
          label={t("nav.toolbox")}
          onClick={handleDisabledClick}
          to="/toolbox"
        />
      </NavLink>

      <NavLink
        active={location.pathname === "/about"}
        component={Link}
        label={t("nav.about")}
        leftSection={
          <IconInfoCircle aria-hidden="true" size={16} stroke={1.5} />
        }
        onClick={onClick}
        to="/about"
      />
    </>
  );
});
