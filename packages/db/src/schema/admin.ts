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
  "document.created",
  "document.updated",
  "document.published",
  "document.unpublished",
  "document.deleted",
  "category.created",
  "category.updated",
  "category.deleted",
  "edital.created",
  "edital.updated",
  // Projetos module — added via ALTER TYPE in P-2.8 migration
  "project.created",
  "project.updated",
  "project.submitted",
  "project.stage_transition",
  "project.deleted",
  "vote.cast",
  "vote.panic",
  // Mudar de voto enquanto a votação está aberta (P-2.8d, PATCH-028), added
  // via ALTER TYPE in 0092_projetos_vote_changed_audit_action.sql
  "vote.changed",
  // Painel de decisão da diretoria grava valor aprovado, distinto da simples
  // transição de estágio (P-2.15 CORRETIVO), added via ALTER TYPE in
  // 0094_projetos_decision_audit_action.sql
  "project.decision_registered",
  // super_admin edita um projeto em validação — a única action que altera
  // qualquer campo nesse estágio (P-2.16 CORRETIVO), added via ALTER TYPE in
  // 0095_projetos_updated_in_validation_audit_action.sql
  "project.updated_in_validation",
  "evaluation.assigned",
  "evaluation.submitted",
  "contestation.created",
  // Contestação do submissor durante a validação (P-2.17 CORRETIVO,
  // PATCH-029) — distinta de "contestation.created" acima (essa é a
  // contestação de diretor/conselheiro na homologação), added via ALTER
  // TYPE in 0097/0098_projetos_submitter_contestation_*_audit_action.sql
  "submitter_contestation.created",
  "submitter_contestation.resolved",
  "report.created",
  "report.submitted",
  // report.reviewed — decisão do diretor (aprovação/rejeição) separada do
  // envio do submissor, added via ALTER TYPE in P-2.6b migration
  "report.reviewed",
  "organization.created",
  "organization.updated",
  // Financeiro module — added via ALTER TYPE in P-0.7 migration
  "financeiro.payable.created",
  "financeiro.payable.cancelled",
  "financeiro.payable.approved",
  "financeiro.payable.authorized",
  "financeiro.payable.paid",
  "financeiro.receivable.created",
  "financeiro.receivable.received",
  "financeiro.transaction.created",
  "financeiro.transaction.reversed",
  "financeiro.import.confirmed",
  "financeiro.import.row.reconciled",
  "financeiro.batch.created",
  "financeiro.batch.approved",
  "financeiro.batch.authorized",
  "financeiro.category.created",
  "financeiro.category.updated",
  "financeiro.category.deleted",
  "financeiro.budget.created",
  "financeiro.budget.updated",
  "financeiro.budget.deleted",
  // Onboarding — added via ALTER TYPE in 0016_onboarding_audit_actions.sql
  "user.rejected",
  "user.signup_requested",
  "mfa.enrolled",
  // Financeiro — organization_budgets (P-3.8b), added via ALTER TYPE
  "financeiro.organization_budget.created",
  "financeiro.organization_budget.updated",
  // LGPD — fundação (P-0.13), added via ALTER TYPE in 0024_lgpd_audit_actions.sql
  "consent.granted",
  "consent.revoked",
  "user.anonymized",
  // Financeiro — bank-account-form (P-3.9), added via ALTER TYPE
  "financeiro.account.created",
  // Financeiro — export manual de relatório mensal (P-3.10), added via
  // ALTER TYPE in 0028_financeiro_report_audit_action.sql
  "financeiro.report.exported",
  // Financeiro — bloqueio por inadimplência de relatório de projeto e
  // override exclusivo de super_admin (P-3.11), added via ALTER TYPE
  "financeiro.payable.blocked",
  "financeiro.payable.block_overridden",
  // Financeiro — centro de custo administrativo (P-3.11b), added via
  // ALTER TYPE in 0072_financeiro_cost_center_audit_actions.sql
  "financeiro.cost_center.created",
  "financeiro.cost_center.updated",
  // Financeiro — cancelamento de recebível (P-3.9c), added via ALTER TYPE in
  // 0073_financeiro_receivable_cancelled_audit_action.sql
  "financeiro.receivable.cancelled",
  // Financeiro — extração de OCR de nota fiscal (P-3.8c), added via ALTER
  // TYPE in 0074_financeiro_ocr_audit_action.sql
  "financeiro.attachment.nf_extracted",
  // Tarefas — pedidos de aprovação de diretor (P-4.6), added via ALTER TYPE
  "task.approval_requested",
  "task.approved",
  "task.rejected",
  // Intranet — anúncios, decisões de reunião e configuração de dashboard
  // (P-5.8), added via ALTER TYPE in 0038_intranet_audit_actions.sql
  "announcement.created",
  "announcement.updated",
  "meeting_decision.created",
  "dashboard_config.updated",
  // PATCH-017 — presidente de sessão pode atualizar status de decisão,
  // added via ALTER TYPE in 0041_intranet_audit_actions_status.sql
  "meeting_decision.status_updated",
  // Plataforma — publicação de curso e emissão de certificado (P-6.6/P-6.8),
  // added via ALTER TYPE in the P-6.6 migration
  "course.published",
  "certificate.issued",
  // Flats — ciclo de vida da reserva e auxílio (P-7.6), added via ALTER
  // TYPE in the P-7.6 migration (G6.3)
  "reservation.submitted",
  "reservation.approved",
  "reservation.rejected",
  "reservation.checked_in",
  "reservation.checked_out",
  "aid.requested",
  "aid.approved",
  // Flats — confirmação/cancelamento de reserva e rejeição de auxílio
  // (P-7.8), added via ALTER TYPE in the P-7.8 migration
  "reservation.confirmed",
  "reservation.cancelled",
  "aid.rejected",
  // Radio — CRUD de autores/séries/faixas/playlists, material exclusivo e
  // aceite de termo (P-8.8), added via ALTER TYPE in
  // 0051_radio_audit_actions.sql
  "author.created",
  "author.updated",
  "author.deleted",
  "series.created",
  "series.updated",
  "series.deleted",
  "track.created",
  "playlist.created",
  "playlist.updated",
  "playlist.deleted",
  "playlist.activated",
  "material.created",
  "term.accepted",
  // LGPD — superfícies de titular e log de acesso a PII (P-9.2), added via
  // ALTER TYPE in 0057_lgpd_data_access_audit_actions.sql (G6.3)
  "data.exported",
  "data.deletion_requested",
  "data.deletion_executed",
  "data.deletion_rejected",
  "pii.accessed",
  // PACOTE 2 (AUDIT/04-BACKLOG-CORRECAO.md, FLX-001) — falha da integração
  // cross-app Projetos -> Financeiro (onProjectApproved) precisa de rastro
  // observável além do console.error, added via ALTER TYPE in
  // 0085_financeiro_integration_failed_audit_action.sql
  "financeiro.integration.failed",
  // Flats — confirmação/ajuste do gestor nos critérios d/g/e do scoring
  // (P-7.13, PATCH-012), added via ALTER TYPE in
  // 0088_flats_scoring_confirmed_audit_action.sql
  "scoring.confirmed",
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
