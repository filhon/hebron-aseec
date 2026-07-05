import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
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
export const userStatusEnum = pgEnum("user_status", [
  "pending_approval",
  "active",
  "rejected",
]);
// P-0.13 — LGPD: finalidades granulares de consentimento (S1-03/F3-09).
export const consentPurposeEnum = pgEnum("consent_purpose", [
  "comunicacao",
  "newsletter",
  "dados_reserva",
  "dado_saude",
]);

// ---------------------------------------------------------------------------
// public.users — mirror of auth.users, kept in sync via trigger
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  documentCpf: text("document_cpf").unique(),
  /**
   * Aprovação de entrada — separada de suspendedModules (que governa acesso
   * de uma conta já ativa). "active" é o default: cobre convite e criação
   * manual, já pré-vetados. Auto-signup começa em "pending_approval" — o
   * trigger public.handle_new_user() decide isso a partir de
   * raw_user_meta_data->>'signup_source' no momento da criação da conta.
   */
  status: userStatusEnum("status").notNull().default("active"),
  suspendedModules: jsonb("suspended_modules")
    .$type<string[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  /**
   * Marcado por `anonymizeUser` (@hebron/db/anonymization, P-0.13) quando o
   * titular exerce o direito de exclusão (LGPD art. 18, VI). A linha e as
   * FKs continuam intactas — só os campos de PII abaixo são substituídos
   * por pseudônimo; isso registra apenas que a substituição já ocorreu
   * (idempotência) e permite excluir a conta de listagens/buscas.
   */
  anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
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
// public.consents — LGPD, consentimento granular por finalidade (P-0.13)
// Uma linha por (usuário, finalidade); revogação é granted=false +
// revoked_at, nunca remoção de linha (mantém histórico de quando existiu).
// ---------------------------------------------------------------------------
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: consentPurposeEnum("purpose").notNull(),
    granted: boolean("granted").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /** Origem da coleta, ex.: "cadastro-flats", "meus-dados" — auditabilidade. */
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("consents_user_purpose_uniq").on(table.userId, table.purpose),
    index("consents_user_id_idx").on(table.userId),
  ],
);

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
export type Consent = typeof consents.$inferSelect;
export type NewConsent = typeof consents.$inferInsert;
export type ConsentPurpose = Consent["purpose"];
