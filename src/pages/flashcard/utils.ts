import { NOTIFICATION_CLOSE_TIMEOUT } from "../../constants";

export const TOGGLE = ["card", "index"] as const;

export const wrongAnswerNotification = {
  color: "red",
  title: "Wrong answer",
  message: "Try again!",
  autoClose: NOTIFICATION_CLOSE_TIMEOUT,
};
