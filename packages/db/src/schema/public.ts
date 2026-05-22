import {
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { DESIGNATION_TYPES, ROLES } from "@hebron/types/roles";

// ---------------------------------------------------------------------------
// Module schemas (tables added per module in their respective B-blocks)
// ---------------------------------------------------------------------------
export const adminSchema = pgSchema("admin");
export const projetosSchema = pgSchema("projetos");
export const plataformaSchema = pgSchema("plataforma");
export const radioSchema = pgSchema("radio");
export const financeiroSchema = pgSchema("financeiro");
export const intranetSchema = pgSchema("intranet");
export const documentosSchema = pgSchema("documentos");
export const flatsSchema = pgSchema("flats");
export const tarefasSchema = pgSchema("tarefas");

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", ROLES);
export const designationTypeEnum = pgEnum(
  "designation_type",
  DESIGNATION_TYPES,
);

// ---------------------------------------------------------------------------
// public.users — mirror of auth.users, kept in sync via trigger
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// public.role_assignments
// ---------------------------------------------------------------------------
export const roleAssignments = pgTable("role_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  scope: text("scope").notNull().default("global"),
  scopeId: uuid("scope_id"),
  grantedBy: uuid("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// public.designations — gestor / autorizador (configuration, not a role)
// ---------------------------------------------------------------------------
export const designations = pgTable("designations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: designationTypeEnum("type").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assignedBy: uuid("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// public.notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RoleAssignment = typeof roleAssignments.$inferSelect;
export type NewRoleAssignment = typeof roleAssignments.$inferInsert;
export type Designation = typeof designations.$inferSelect;
export type NewDesignation = typeof designations.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
