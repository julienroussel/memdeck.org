import type { TFunction } from "i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../constants";

export const buildWrongAnswerNotification = (t: TFunction) => ({
  autoClose: NOTIFICATION_CLOSE_TIMEOUT,
  color: "red" as const,
  message: t("common.wrongAnswerMessage"),
  title: t("common.wrongAnswerTitle"),
});
