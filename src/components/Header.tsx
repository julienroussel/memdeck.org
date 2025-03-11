import {
  Anchor,
  Burger,
  Image,
  Group,
  Text,
  ActionIcon,
  Switch,
  useMantineColorScheme,
} from '@mantine/core';
import { Help } from './Help';
import { GITHUB_URL } from '../constants';
import { IconBrandGithub, IconMoonStars, IconSun } from '@tabler/icons-react';
// eslint-disable-next-line import/no-unresolved
import memdeckLightLogo from '/memdeck-white.png';
// eslint-disable-next-line import/no-unresolved
import memdeckDarkLogo from '/memdeck-black.png';

type HeaderProps = {
  opened: boolean;
  toggle: () => void;
};

export const Header = ({ opened, toggle }: HeaderProps) => {
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <Anchor href="/" underline="never">
          <Image
            radius="md"
            h={30}
            w="auto"
            fit="contain"
            src={memdeckLightLogo}
            darkHidden
          />
          <Image
            radius="md"
            h={30}
            w="auto"
            fit="contain"
            src={memdeckDarkLogo}
            lightHidden
          />
        </Anchor>
        <Text fw={700} tt="uppercase">
          MemDeck
        </Text>
      </Group>
      <Group>
        <Help />
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Github"
          component="a"
          target="_blank"
          href={GITHUB_URL}
        >
          <IconBrandGithub />
        </ActionIcon>
        <Switch
          size="md"
          color="dark.4"
          onLabel={<IconSun size={16} color="var(--mantine-color-yellow-4)" />}
          offLabel={
            <IconMoonStars size={16} color="var(--mantine-color-blue-6)" />
          }
          checked={colorScheme === 'light'}
          onChange={(event) =>
            setColorScheme(event.currentTarget.checked ? 'light' : 'dark')
          }
        />
      </Group>
    </Group>
  );
};
