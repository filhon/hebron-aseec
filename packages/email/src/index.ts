export { EmailLayout } from "./components/layout";
export type { EmailLayoutProps } from "./components/layout";
export { emailColors, emailFontFamily } from "./components/layout";

export { createNotification } from "./lib/send";
export type {
  CreateNotificationOptions,
  InsertNotificationFn,
  NotificationChannel,
  NotificationInsertData,
  SendEmailOptions,
} from "./lib/send";
