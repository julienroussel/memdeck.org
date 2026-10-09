// Badge values are announced through visually hidden sentences; anchoring at
// both ends excludes the score live region ("Correct answers: 1, Incorrect…").
export const CORRECT_ANSWERS_PATTERN = /^correct answers: \d+$/i;
export const INCORRECT_ANSWERS_PATTERN = /^incorrect answers: \d+$/i;
export const PROGRESS_SENTENCE_PATTERN = /^progress: \d+(\/\d+)?$/i;
