import {
  boolean,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { adminSchema, users } from "./public";

// ---------------------------------------------------------------------------
// Enums (within admin schema for isolation)
// ---------------------------------------------------------------------------
export const auditActionEnum = adminSchema.enum("audit_action", [
  "user.created",
  "user.updated",
  "user.suspended",
  "user.approved",
  "user.impersonated",
  "role.granted",
  "role.revoked",
  "invitation.created",
  "invitation.accepted",
  "invitation.revoked",
  "setting.updated",
  "feature_flag.toggled",
  "email_template.updated",
  "meeting.created",
  "meeting.updated",
  "designation.assigned",
  "designation.revoked",
]);

export const meetingTypeEnum = adminSchema.enum("meeting_type", [
  "mensal",
  "ordinaria",
  "extraordinaria",
]);

export const meetingStatusEnum = adminSchema.enum("meeting_status", [
  "scheduled",
  "in_progress",
  "concluded",
  "cancelled",
]);

// ---------------------------------------------------------------------------
// admin.audit_log
// Particionada por mês via RANGE em created_at (ver migration 0002).
// A PK composta (id, created_at) é obrigatória para tabelas particionadas.
// ---------------------------------------------------------------------------
export const auditLog = adminSchema.table(
  "audit_log",
  {
    id: uuid("id").notNull().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    action: auditActionEnum("action").notNull(),
    entity: text("entity").notNull(), // e.g. "user", "invitation"
    entityId: uuid("entity_id"),
    diff: jsonb("diff"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.createdAt] }),
    index("audit_log_actor_id_idx").on(table.actorId),
    index("audit_log_entity_entity_id_idx").on(table.entity, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// admin.invitations
// ---------------------------------------------------------------------------
export const invitations = adminSchema.table(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    roles: jsonb("roles").$type<string[]>().notNull().default([]),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invitations_email_idx").on(table.email),
    index("invitations_token_idx").on(table.token),
  ],
);

// ---------------------------------------------------------------------------
// admin.email_templates
// ---------------------------------------------------------------------------
export const emailTemplates = adminSchema.table("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),
  variables: jsonb("variables").$type<string[]>().notNull().default([]),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// admin.meeting_sessions
// ---------------------------------------------------------------------------
export const meetingSessions = adminSchema.table("meeting_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  type: meetingTypeEnum("type").notNull(),
  chairUserId: uuid("chair_user_id").references(() => users.id),
  status: meetingStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// admin.feature_flags
// ---------------------------------------------------------------------------
export const featureFlags = adminSchema.table("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description"),
  rolloutPercent: integer("rollout_percent").notNull().default(100),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// admin.system_settings
// ---------------------------------------------------------------------------
export const systemSettings = adminSchema.table("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(false),
  updatedBy: uuid("updated_by")
    .notNull()
    .references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
export type MeetingSession = typeof meetingSessions.$inferSelect;
export type NewMeetingSession = typeof meetingSessions.$inferInsert;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
