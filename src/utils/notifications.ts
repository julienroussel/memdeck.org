import type { TFunction } from "i18next";
import { NOTIFICATION_CLOSE_TIMEOUT } from "../constants";

export const buildWrongAnswerNotification = (t: TFunction) => ({
  color: "red" as const,
  title: t("common.wrongAnswerTitle"),
  message: t("common.wrongAnswerMessage"),
  autoClose: NOTIFICATION_CLOSE_TIMEOUT,
});
