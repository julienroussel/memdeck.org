import { useCallback, useState } from "react";
import { DECK_SIZE } from "../../constants";

/** Maximum valid cut depth (deck size - 1) */
const MAX_CUT_DEPTH = DECK_SIZE - 1;

/** Validates that cut depth is within valid range (0 to 51) */
const isValidCutDepth = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= MAX_CUT_DEPTH;

export const useCutDepthInput = (
  submitAnswer: (depth: number) => void
): {
  cutDepth: number | "";
  maxCutDepth: number;
  handleCutDepthChange: (value: string | number) => void;
  handleCheckAnswer: () => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
} => {
  const [cutDepth, setCutDepth] = useState<number | "">("");

  const handleCutDepthChange = useCallback((value: string | number) => {
    setCutDepth(value === "" ? "" : Number(value));
  }, []);

  const handleCheckAnswer = useCallback(() => {
    if (cutDepth === "") {
      return;
    }
    if (!isValidCutDepth(cutDepth)) {
      return;
    }
    submitAnswer(cutDepth);
    setCutDepth("");
  }, [cutDepth, submitAnswer]);

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
    maxCutDepth: MAX_CUT_DEPTH,
    handleCutDepthChange,
    handleCheckAnswer,
    handleKeyDown,
  };
};
