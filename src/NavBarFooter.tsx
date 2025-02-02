import { Space, Center, Anchor, ActionIcon, NativeSelect } from '@mantine/core';
import { IconBrandGithub, IconHelp } from '@tabler/icons-react';
import { stacks } from './stacks';
import { useLocalStorage } from '@mantine/hooks';

export const NavBarFooter = () => {
  const [stack, setStack] = useLocalStorage({
    key: 'stack',
    defaultValue: '',
  });

  const availableStacks = Object.entries(stacks)
    .map(([key, stack]) => ({
      label: stack.name,
      value: key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const stackSelection =
    stack !== ''
      ? availableStacks
      : [{ label: 'Please choose a stack', value: '' }, ...availableStacks];

  return (
    <>
      <Center>
        <NativeSelect
          value={stack}
          onChange={(event) => setStack(event.currentTarget.value)}
          data={stackSelection}
        />
      </Center>
      <Space h="md" />
      <Center>
        <ActionIcon size={42} variant="default" aria-label="Help">
          <IconHelp size={24} />
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
    </>
  );
};
