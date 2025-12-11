import {
  ActionIcon,
  Anchor,
  Burger,
  Group,
  Image,
  Switch,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconBrandGithub, IconMoonStars, IconSun } from "@tabler/icons-react";
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

  return (
    <Group h="100%" justify="space-between" px="md">
      <Group>
        <Burger hiddenFrom="sm" onClick={toggle} opened={opened} size="sm" />
        <Anchor href="/" underline="never">
          <Image
            darkHidden
            fit="contain"
            h={30}
            radius="md"
            src={memdeckLightLogo}
            w="auto"
          />
          <Image
            fit="contain"
            h={30}
            lightHidden
            radius="md"
            src={memdeckDarkLogo}
            w="auto"
          />
        </Anchor>
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
          target="_blank"
          variant="subtle"
        >
          <IconBrandGithub />
        </ActionIcon>
        <Switch
          checked={colorScheme === "light"}
          color="dark.4"
          offLabel={
            <IconMoonStars color="var(--mantine-color-blue-6)" size={16} />
          }
          onChange={(event) =>
            setColorScheme(event.currentTarget.checked ? "light" : "dark")
          }
          onLabel={<IconSun color="var(--mantine-color-yellow-4)" size={16} />}
          size="md"
        />
      </Group>
    </Group>
  );
};
