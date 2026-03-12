import { NavLink } from "@mantine/core";
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
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

export const NavLinks = memo(function NavLinks({
  onClick,
}: {
  onClick: () => void;
}) {
  const location = useLocation();
  const { t } = useTranslation();

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
        <NavLink
          active={location.pathname === "/flashcard"}
          component={Link}
          label={t("nav.flashcard")}
          leftSection={<IconPlayCardStar size={16} stroke={1.5} />}
          onClick={onClick}
          to="/flashcard"
        />
        <NavLink
          active={location.pathname === "/spot-check"}
          component={Link}
          label={t("nav.spotCheck")}
          leftSection={<IconEyeSearch size={16} stroke={1.5} />}
          onClick={onClick}
          to="/spot-check"
        />
        <NavLink
          active={location.pathname === "/acaan"}
          component={Link}
          label={t("nav.acaan")}
          leftSection={<IconNumber size={16} stroke={1.5} />}
          onClick={onClick}
          to="/acaan"
        />
        <NavLink
          active={location.pathname === "/toolbox"}
          component={Link}
          label={t("nav.toolbox")}
          leftSection={<IconTools size={16} stroke={1.5} />}
          onClick={onClick}
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
