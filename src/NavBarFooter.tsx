import { Space, Center, Anchor, ActionIcon } from '@mantine/core';
import { IconBrandGithub, IconHelp, IconSettings } from '@tabler/icons-react';

export const NavBarFooter = () => {
  return (
    <Center>
      <ActionIcon size={42} variant="default" aria-label="Github">
        <IconHelp size={24} />
      </ActionIcon>
      <Space w="xs" />
      <ActionIcon size={42} variant="default" aria-label="Github">
        <IconSettings size={24} />
      </ActionIcon>
      <Space w="xs" />
      <Anchor
        href="https://github.com/julienroussel/memdeck.org"
        target="_blank"
      >
        <ActionIcon size={42} variant="default" aria-label="Github">
          <IconBrandGithub size={24} />
        </ActionIcon>
      </Anchor>
    </Center>
  );
};
