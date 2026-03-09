import { Anchor, Divider, Group, Text, VisuallyHidden } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { GITHUB_URL } from "../constants";
import { useSelectedStack } from "../hooks/use-selected-stack";
import { LanguagePicker } from "./language-picker";
import { ResetButton } from "./reset-button";
import { ShareButton } from "./share-button";
import { StackPicker } from "./stack-picker";
import { StackRangeBadge } from "./stack-range-badge";

const commitHashStyle: React.CSSProperties = { fontFamily: "monospace" };

export const NavFooter = () => {
  const { t } = useTranslation();
  const { stackKey, stackName } = useSelectedStack();
  const hasStack = stackKey !== "";

  return (
    <>
      {hasStack && (
        <>
          <Divider
            label={t("stackPicker.label")}
            labelPosition="center"
            mb="xs"
          />
          <Group gap="xs" wrap="nowrap">
            <div style={{ flex: 1 }}>
              <StackPicker />
            </div>
            <StackRangeBadge stackKey={stackKey} stackName={stackName} />
          </Group>
        </>
      )}
      <Divider
        label={t("languagePicker.label")}
        labelPosition="center"
        mb="xs"
        mt="md"
      />
      <LanguagePicker />
      <Divider mt="md" />
      <Group justify="space-between" mt="xs">
        <Anchor
          aria-label={t("header.githubAriaLabel")}
          c="dimmed"
          href={GITHUB_URL}
          rel="noopener"
          target="_blank"
          underline="hover"
        >
          <IconBrandGithub aria-hidden="true" size={16} />
        </Anchor>
        <ShareButton />
        <Text c="dimmed" size="xs">
          <VisuallyHidden>Build version:</VisuallyHidden>
          v. <span style={commitHashStyle}>{__COMMIT_HASH__}</span>
        </Text>
        <ResetButton />
      </Group>
    </>
  );
};
