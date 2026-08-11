import { sql } from "drizzle-orm";
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
// P-9.2 — LGPD: ciclo de vida do pedido de exclusão do titular. O pedido é
// um "ticket" para super_admin: "pending" ao ser aberto pelo titular em
// "Meus Dados"; "completed" quando super_admin executa a anonimização
// (fluxo de P-0.13); "rejected" quando há base legal para reter (ex.:
// obrigação contábil em curso). Nunca é removido — mantém o rastro do
// exercício do direito.
export const dataDeletionRequestStatusEnum = pgEnum(
  "data_deletion_request_status",
  ["pending", "completed", "rejected"],
);

// ---------------------------------------------------------------------------
// public.users — mirror of auth.users, kept in sync via trigger
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  /** Diretório interno (P-5.1b) — texto livre, sem policy própria: users_update_own cobre. */
  bio: text("bio"),
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
export const roleAssignments = pgTable(
  "role_assignments",
  {
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
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id),
    revocationReason: text("revocation_reason"),
  },
  (table) => [
    // Tabela mais quente do ecossistema: public.has_role() a consulta dentro
    // do USING de praticamente toda policy RLS dos 9 schemas, e resolveSession
    // (@hebron/auth) a lê em toda requisição autenticada. Sem índice, cada
    // verificação de papel era um seq scan (P-9.3).
    //
    // (user_id, role) parcial cobre exatamente o EXISTS de has_role
    // (user_id = auth.uid() AND role = ANY(...) AND revoked_at IS NULL),
    // permitindo index-only scan; o mesmo índice atende resolveSession, que
    // seleciona só `role` filtrando por user_id.
    index("role_assignments_user_id_role_active_idx")
      .on(table.userId, table.role)
      .where(sql`${table.revokedAt} IS NULL`),
    // Fan-out de notificações filtra por papel sem user_id ("todos os
    // diretores", "todos os super_admin") em ~10 pontos dos apps.
    index("role_assignments_role_active_idx")
      .on(table.role)
      .where(sql`${table.revokedAt} IS NULL`),
  ],
);

// ---------------------------------------------------------------------------
// public.designations — gestor / autorizador (configuration, not a role)
// ---------------------------------------------------------------------------
export const designations = pgTable(
  "designations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: designationTypeEnum("type").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id),
    revocationReason: text("revocation_reason"),
  },
  (table) => [
    // Lida junto com role_assignments em toda resolveSession (designações
    // gestor/autorizador do usuário corrente) — P-9.3.
    index("designations_user_id_active_idx")
      .on(table.userId)
      .where(sql`${table.revokedAt} IS NULL`),
  ],
);

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
// public.data_deletion_requests — LGPD, pedido de exclusão do titular (P-9.2)
// Ticket para super_admin: o titular abre (status "pending"); a execução usa
// a primitiva de anonimização de P-0.13 (anonymizeUser), marcando "completed".
// Sem DELETE — o registro do exercício do direito é preservado.
// ---------------------------------------------------------------------------
export const dataDeletionRequests = pgTable(
  "data_deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: dataDeletionRequestStatusEnum("status")
      .notNull()
      .default("pending"),
    /** Motivo opcional informado pelo titular ao solicitar. Não é PII. */
    reason: text("reason"),
    /** super_admin que executou/recusou o pedido. */
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    /** Justificativa da recusa (ex.: retenção contábil obrigatória). */
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("data_deletion_requests_user_id_idx").on(table.userId),
    index("data_deletion_requests_status_idx").on(table.status),
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
export type Consent = typeof consents.$inferSelect;
export type NewConsent = typeof consents.$inferInsert;
export type ConsentPurpose = Consent["purpose"];
export type DataDeletionRequest = typeof dataDeletionRequests.$inferSelect;
export type NewDataDeletionRequest = typeof dataDeletionRequests.$inferInsert;
export type DataDeletionRequestStatus = DataDeletionRequest["status"];
