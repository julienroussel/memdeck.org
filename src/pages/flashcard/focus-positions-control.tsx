import { Button, Group, Stack, TextInput } from "@mantine/core";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DECK_SIZE, DEFAULT_CHOICES_COUNT } from "../../constants";
import type { DeckPosition } from "../../types/stacks";
import type { FocusPositionsError } from "../../utils/focus-positions";
import {
  formatFocusPositions,
  parseFocusPositions,
} from "../../utils/focus-positions";

type FocusPositionsControlProps = {
  positions: readonly DeckPosition[];
  onChange: (positions: readonly DeckPosition[]) => void;
};

const formatError = (
  t: ReturnType<typeof useTranslation>["t"],
  error: FocusPositionsError
): string => {
  switch (error.kind) {
    case "invalidToken":
      return t("flashcard.focusErrorInvalidToken", { token: error.token });
    case "outOfRange":
      return t("flashcard.focusErrorOutOfRange", {
        max: DECK_SIZE,
        token: error.token,
      });
    case "reversedRange":
      return t("flashcard.focusErrorReversedRange", {
        fixed: error.fixed,
        token: error.token,
      });
    case "duplicate":
      return t("flashcard.focusErrorDuplicate", { position: error.position });
    case "tooFew":
      return t("flashcard.focusErrorTooFew", { min: DEFAULT_CHOICES_COUNT });
    default: {
      const _exhaustive: never = error;
      return _exhaustive;
    }
  }
};

/**
 * Text field for Flashcard's focus list. The draft is parsed only on Apply
 * (or Enter), so a half-typed range is not flagged while typing; an empty
 * field applied clears the list. The field follows the stored list: it shows
 * the tidy form once a change is saved, and keeps what was typed when a save
 * fails, so an unsaved list is never shown as applied.
 */
export const FocusPositionsControl = ({
  positions,
  onChange,
}: FocusPositionsControlProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const stored = formatFocusPositions(positions);
  const [draft, setDraft] = useState(stored);
  const [shownStored, setShownStored] = useState(stored);
  const [error, setError] = useState<FocusPositionsError | null>(null);

  // The stored list changed (a saved Apply or Clear, another tab, a stack
  // switch): show it, discarding the draft.
  if (stored !== shownStored) {
    setShownStored(stored);
    setDraft(stored);
    setError(null);
  }

  // Names the list, not only its size, so applying a list of the same size is
  // announced too.
  const activeAnnouncement =
    positions.length > 0
      ? `${t("flashcard.focusActive", { count: positions.length })} · ${stored}`
      : "";

  const handleDraftChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.currentTarget.value);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = parseFocusPositions(draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (formatFocusPositions(result.positions) === stored) {
      setDraft(stored);
      return;
    }
    onChange(result.positions);
  };

  // Clear unmounts itself, so focus moves to the field rather than the page.
  const handleClear = () => {
    setError(null);
    onChange([]);
    inputRef.current?.focus();
  };

  return (
    // `contain: inline-size` keeps the description from widening the settings
    // popover: the field takes the width the mode and timer controls give it,
    // and the text wraps (without it the popover ran past a 320 px screen).
    <form onSubmit={handleSubmit} style={{ contain: "inline-size" }}>
      <Stack gap="xs">
        <TextInput
          autoComplete="off"
          description={t("flashcard.focusDescription")}
          error={error ? formatError(t, error) : undefined}
          errorProps={{ role: "alert" }}
          label={t("flashcard.focusLabel")}
          onChange={handleDraftChange}
          placeholder={t("flashcard.focusPlaceholder")}
          ref={inputRef}
          size="xs"
          spellCheck={false}
          value={draft}
        />
        <Group gap="xs">
          <Button size="compact-sm" type="submit" variant="light">
            {t("flashcard.focusApply")}
          </Button>
          {positions.length > 0 ? (
            <Button
              color="gray"
              onClick={handleClear}
              size="compact-sm"
              variant="subtle"
            >
              {t("flashcard.focusClear")}
            </Button>
          ) : null}
        </Group>
        <span aria-live="polite" className="sr-only">
          {activeAnnouncement}
        </span>
      </Stack>
    </form>
  );
};
