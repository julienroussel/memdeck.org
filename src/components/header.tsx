import {
  ActionIcon,
  Burger,
  Group,
  Image,
  Switch,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconBrandGithub, IconMoonStars, IconSun } from "@tabler/icons-react";
import { Link } from "react-router";
// eslint-disable-next-line import/no-unresolved
import memdeckDarkLogo from "/memdeck-black.png";
// eslint-disable-next-line import/no-unresolved
import memdeckLightLogo from "/memdeck-white.png";
import { GITHUB_URL } from "../constants";
import { Help } from "./help";

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};

export const Header = ({ opened, toggle }: HeaderProps) => {
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  const handleColorSchemeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setColorScheme(event.currentTarget.checked ? "light" : "dark");
  };

  return (
    <Group h="100%" justify="space-between" px="md">
      <Group>
        <Burger hiddenFrom="sm" onClick={toggle} opened={opened} size="sm" />
        <Link to="/">
          <Image
            alt="MemDeck"
            darkHidden
            fit="contain"
            h={30}
            radius="md"
            src={memdeckLightLogo}
            w="auto"
          />
          <Image
            alt="MemDeck"
            fit="contain"
            h={30}
            lightHidden
            radius="md"
            src={memdeckDarkLogo}
            w="auto"
          />
        </Link>
        <Text fw={700} tt="uppercase">
          MemDeck
        </Text>
      </Group>
      <Group>
        <Help />
        <ActionIcon
          aria-label="Github"
          color="gray"
          component="a"
          href={GITHUB_URL}
          rel="noopener"
          target="_blank"
          variant="subtle"
        >
          <IconBrandGithub />
        </ActionIcon>
        <Switch
          aria-label="Toggle color scheme"
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
};
