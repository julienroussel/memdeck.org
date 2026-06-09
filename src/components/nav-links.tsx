import { Badge, NavLink, VisuallyHidden } from "@mantine/core";
import {
  IconArrowsLeftRight,
  IconBook2,
  IconChartBar,
  IconExternalLink,
  IconEyeSearch,
  IconHome2,
  IconInfoCircle,
  IconNumber,
  IconPlayCardStar,
  IconSparkles,
  IconTools,
} from "@tabler/icons-react";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { ROUTES } from "../constants";
import { useUnseenWhatsNew } from "../hooks/use-unseen-whats-new";

export const NavLinks = memo(function NavLinks({
  onClick,
}: {
  onClick: () => void;
}) {
  const location = useLocation();
  const { t } = useTranslation();
  const { hasUnseen } = useUnseenWhatsNew();
  // Controlled so aria-expanded can be set: Mantine NavLink only emits
  // data-expanded, which screen readers don't announce.
  const [toolsOpened, setToolsOpened] = useState(true);

  return (
    <>
      <NavLink
        active={location.pathname === ROUTES.home}
        aria-current={location.pathname === ROUTES.home ? "page" : undefined}
        component={Link}
        label={t("nav.home")}
        leftSection={<IconHome2 size={16} stroke={1.5} />}
        onClick={onClick}
        to={ROUTES.home}
      />
      <NavLink
        active={location.pathname === ROUTES.guide}
        aria-current={location.pathname === ROUTES.guide ? "page" : undefined}
        component={Link}
        label={t("nav.guide")}
        leftSection={<IconBook2 size={16} stroke={1.5} />}
        onClick={onClick}
        to={ROUTES.guide}
      />
      <NavLink
        active={location.pathname === ROUTES.resources}
        aria-current={
          location.pathname === ROUTES.resources ? "page" : undefined
        }
        component={Link}
        label={t("nav.resources")}
        leftSection={<IconExternalLink size={16} stroke={1.5} />}
        onClick={onClick}
        to={ROUTES.resources}
      />
      <NavLink
        active={location.pathname === ROUTES.stats}
        aria-current={location.pathname === ROUTES.stats ? "page" : undefined}
        component={Link}
        label={t("nav.stats")}
        leftSection={<IconChartBar size={16} stroke={1.5} />}
        onClick={onClick}
        to={ROUTES.stats}
      />
      <NavLink
        active={location.pathname === ROUTES.whatsNew}
        aria-current={
          location.pathname === ROUTES.whatsNew ? "page" : undefined
        }
        component={Link}
        label={t("nav.whatsNew")}
        leftSection={<IconSparkles aria-hidden="true" size={16} stroke={1.5} />}
        onClick={onClick}
        rightSection={
          hasUnseen ? (
            <>
              <Badge aria-hidden="true" size="xs" variant="filled">
                {t("whatsNew.badgeNew")}
              </Badge>
              <VisuallyHidden>{t("nav.whatsNewUnseen")}</VisuallyHidden>
            </>
          ) : undefined
        }
        to={ROUTES.whatsNew}
      />

      <NavLink
        aria-expanded={toolsOpened}
        component="button"
        label={t("nav.tools")}
        leftSection={<IconTools size={16} stroke={1.5} />}
        onChange={setToolsOpened}
        opened={toolsOpened}
      >
        <NavLink
          active={location.pathname === ROUTES.flashcard}
          aria-current={
            location.pathname === ROUTES.flashcard ? "page" : undefined
          }
          component={Link}
          label={t("nav.flashcard")}
          leftSection={<IconPlayCardStar size={16} stroke={1.5} />}
          onClick={onClick}
          to={ROUTES.flashcard}
        />
        <NavLink
          active={location.pathname === ROUTES.spotCheck}
          aria-current={
            location.pathname === ROUTES.spotCheck ? "page" : undefined
          }
          component={Link}
          label={t("nav.spotCheck")}
          leftSection={<IconEyeSearch size={16} stroke={1.5} />}
          onClick={onClick}
          to={ROUTES.spotCheck}
        />
        <NavLink
          active={location.pathname === ROUTES.acaan}
          aria-current={location.pathname === ROUTES.acaan ? "page" : undefined}
          component={Link}
          label={t("nav.acaan")}
          leftSection={<IconNumber size={16} stroke={1.5} />}
          onClick={onClick}
          to={ROUTES.acaan}
        />
        <NavLink
          active={location.pathname === ROUTES.distance}
          aria-current={
            location.pathname === ROUTES.distance ? "page" : undefined
          }
          component={Link}
          label={t("nav.distance")}
          leftSection={<IconArrowsLeftRight size={16} stroke={1.5} />}
          onClick={onClick}
          to={ROUTES.distance}
        />
        <NavLink
          active={location.pathname === ROUTES.toolbox}
          aria-current={
            location.pathname === ROUTES.toolbox ? "page" : undefined
          }
          component={Link}
          label={t("nav.toolbox")}
          leftSection={<IconTools size={16} stroke={1.5} />}
          onClick={onClick}
          to={ROUTES.toolbox}
        />
      </NavLink>

      <NavLink
        active={location.pathname === ROUTES.about}
        aria-current={location.pathname === ROUTES.about ? "page" : undefined}
        component={Link}
        label={t("nav.about")}
        leftSection={
          <IconInfoCircle aria-hidden="true" size={16} stroke={1.5} />
        }
        onClick={onClick}
        to={ROUTES.about}
      />
    </>
  );
});
