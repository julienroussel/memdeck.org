import { useCallback, useState } from "react";
import { DECK_SIZE } from "../../constants";
import type { AcaanScenario } from "../../utils/acaan-scenario";

/** Maximum valid cut depth (deck size - 1) */
const MAX_CUT_DEPTH = DECK_SIZE - 1;

/** Validates that cut depth is within valid range (0 to 51) */
const isValidCutDepth = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= MAX_CUT_DEPTH;

/** Typed input, tagged with the scenario it was typed for. */
type CutDepthDraft = { scenario: AcaanScenario; value: number | "" };

/**
 * @param scenario - The current scenario, a fresh object per round. Input typed
 * for an earlier scenario is dropped, so digits left by a timeout or a reveal
 * never carry into the next question.
 */
export const useCutDepthInput = (
  submitAnswer: (depth: number) => void,
  scenario: AcaanScenario
): {
  cutDepth: number | "";
  maxCutDepth: number;
  handleCutDepthChange: (value: string | number) => void;
  handleCheckAnswer: () => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
} => {
  const [draft, setDraft] = useState<CutDepthDraft>({ scenario, value: "" });
  const cutDepth = draft.scenario === scenario ? draft.value : "";

  const handleCutDepthChange = useCallback(
    (value: string | number) => {
      setDraft({ scenario, value: value === "" ? "" : Number(value) });
    },
    [scenario]
  );

  const handleCheckAnswer = useCallback(() => {
    if (cutDepth === "") {
      return;
    }
    if (!isValidCutDepth(cutDepth)) {
      return;
    }
    submitAnswer(cutDepth);
    setDraft({ scenario, value: "" });
  }, [cutDepth, scenario, submitAnswer]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && cutDepth !== "") {
        event.preventDefault();
        handleCheckAnswer();
      }
    },
    [cutDepth, handleCheckAnswer]
  );

  return {
    cutDepth,
    handleCheckAnswer,
    handleCutDepthChange,
    handleKeyDown,
    maxCutDepth: MAX_CUT_DEPTH,
  };
};
