import { SHARE_NUDGE_MIN_SESSIONS } from "../constants";

/**
 * Whether the share nudge would currently show. Shared by `ShareNudge` and the
 * discovery card so only one home card surfaces at a time — the discovery card
 * yields (renders nothing) while the share nudge is still pending.
 */
export const isShareNudgePending = (
  shareDismissed: boolean,
  totalSessions: number
): boolean => !shareDismissed && totalSessions >= SHARE_NUDGE_MIN_SESSIONS;
