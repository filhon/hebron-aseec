import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./public";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
]);

// ---------------------------------------------------------------------------
// public.notifications — expandido com channel, type, payload, sent_at
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    type: text("type").notNull().default("generic"),
    title: text("title").notNull(),
    body: text("body"),
    payload: jsonb("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_user_id_read_at_idx").on(table.userId, table.readAt),
    index("notifications_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
