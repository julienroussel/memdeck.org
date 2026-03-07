import {
  Burger,
  Group,
  Image,
  Switch,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoonStars, IconSun } from "@tabler/icons-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
// eslint-disable-next-line import/no-unresolved
import memdeckDarkLogo from "/memdeck-black.webp";
// eslint-disable-next-line import/no-unresolved
import memdeckLightLogo from "/memdeck-white.webp";
import { analytics } from "../services/analytics";

const homeLinkStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "inherit",
};

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};

export const Header = memo(function Header({ opened, toggle }: HeaderProps) {
  const { setColorScheme, colorScheme } = useMantineColorScheme();
  const { t } = useTranslation();

  const handleColorSchemeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const scheme = event.currentTarget.checked ? "light" : "dark";
    setColorScheme(scheme);
    analytics.trackEvent("Settings", "Theme Toggled", scheme);
  };

  return (
    <Group h="100%" justify="space-between" px="md">
      <Group>
        <Burger
          aria-controls="main-nav"
          aria-expanded={opened}
          aria-label={t("header.toggleNav")}
          onClick={toggle}
          opened={opened}
          size="sm"
        />
        <Group
          gap="sm"
          renderRoot={(props) => (
            <Link {...props} style={homeLinkStyle} to="/" />
          )}
        >
          <Image
            alt=""
            darkHidden
            fit="contain"
            h={30}
            radius="md"
            src={memdeckLightLogo}
            w={30}
          />
          <Image
            alt=""
            fit="contain"
            h={30}
            lightHidden
            radius="md"
            src={memdeckDarkLogo}
            w={30}
          />
          <Text fw={700} tt="uppercase">
            MemDeck
          </Text>
        </Group>
      </Group>
      <Group>
        <Switch
          aria-label={t("header.toggleColorScheme")}
          checked={colorScheme === "light"}
          color="dark.4"
          offLabel={
            <IconMoonStars color="var(--mantine-color-blue-6)" size={16} />
          }
          onChange={handleColorSchemeChange}
          onLabel={<IconSun color="var(--mantine-color-yellow-4)" size={16} />}
          size="md"
        />
      </Group>
    </Group>
  );
});

Header.displayName = "Header";
