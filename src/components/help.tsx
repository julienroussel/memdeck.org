import { ActionIcon, Anchor, Modal, Space, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHelp } from "@tabler/icons-react";
import { GITHUB_URL } from "../constants";

export const Help = () => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal
        onClose={close}
        opened={opened}
        size="auto"
        withCloseButton={false}
      >
        <Title order={1}>What is MemDeck?</Title>
        <Space h="lg" />
        <Text>
          MemDeck is your go-to tool for mastering a memorized deck of cards.
          Whether you're a magician, a memory buff, or simply curious about
          memorization, MemDeck offers straightforward exercises to train and
          test your skills.
        </Text>
        <Space h="lg" />
        <Text>
          Swing by the project's{" "}
          <Anchor href={GITHUB_URL} target="_blank" underline="never">
            GitHub page
          </Anchor>{" "}
          if you need help or have a feature request. Just a heads-up: this tool
          is all about simplicity, and it's a side project built in my spare
          time.
        </Text>
      </Modal>

      <ActionIcon
        aria-label="Help"
        color="gray"
        onClick={open}
        variant="subtle"
      >
        <IconHelp />
      </ActionIcon>
    </>
  );
};
