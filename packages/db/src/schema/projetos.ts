import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  vector,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { projetosSchema, users } from "./public";
import { editals } from "./documentos";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const projectTypeEnum = projetosSchema.enum("project_type", [
  "pontual",
  "anual",
]);

export const projectStageEnum = projetosSchema.enum("project_stage", [
  "rascunho",
  "validacao",
  "votacao",
  "homologacao",
  "aprovado",
  "reprovado",
  "em_execucao",
  "concluido",
]);

export const reportStatusEnum = projetosSchema.enum("report_status", [
  "pendente",
  "submitted",
  "approved",
  "rejected",
]);

export const paymentStatusEnum = projetosSchema.enum("payment_status", [
  "pendente",
  "aprovado",
  "pago",
  "cancelado",
]);

export const contestationStatusEnum = projetosSchema.enum(
  "contestation_status",
  ["pending", "accepted", "rejected"],
);

export const evaluationRecommendationEnum = projetosSchema.enum(
  "evaluation_recommendation",
  ["approved", "rejected"],
);

// ---------------------------------------------------------------------------
// State machine — TypeScript-only; enforced in Server Actions
// ---------------------------------------------------------------------------
export const PROJECT_STAGES = [
  "rascunho",
  "validacao",
  "votacao",
  "homologacao",
  "aprovado",
  "reprovado",
  "em_execucao",
  "concluido",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

// pontual: validacao → aprovado | reprovado (skip votacao/homologacao)
// anual:   validacao → votacao → homologacao → aprovado | reprovado
export const VALID_STAGE_TRANSITIONS: Record<ProjectStage, ProjectStage[]> = {
  rascunho: ["validacao"],
  validacao: ["votacao", "aprovado", "reprovado"],
  votacao: ["homologacao"],
  homologacao: ["aprovado", "reprovado"],
  aprovado: ["em_execucao"],
  reprovado: [],
  em_execucao: ["concluido"],
  concluido: [],
};

// ---------------------------------------------------------------------------
// projetos.categories — árvore hierárquica de categorias de projeto
// ---------------------------------------------------------------------------
export const projectCategories = projetosSchema.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => projectCategories.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("proj_categories_slug_idx").on(table.slug),
    index("proj_categories_parent_id_idx").on(table.parentId),
  ],
);

// ---------------------------------------------------------------------------
// projetos.organizations
// ---------------------------------------------------------------------------
export const organizations = projetosSchema.table(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    cnpj: text("cnpj").unique(),
    endereco: text("endereco"),
    telefone: text("telefone"),
    responsavelLegal: text("responsavel_legal"),
    denominacao: text("denominacao"),
    estatutoUrl: text("estatuto_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("organizations_cnpj_idx").on(table.cnpj),
    index("organizations_created_by_idx").on(table.createdBy),
  ],
);

// ---------------------------------------------------------------------------
// projetos.organization_members — N:N
// ---------------------------------------------------------------------------
export const organizationMembers = projetosSchema.table(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("org_members_user_id_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// DuplicateCandidateSnapshot — shape de projects.duplicate_candidates (P-2.14)
// ---------------------------------------------------------------------------
export interface DuplicateCandidateSnapshot {
  projectId: string;
  title: string;
  orgName: string;
  /** Similaridade de cosseno no momento da submissão, 0–1 */
  similarity: number;
}

// ---------------------------------------------------------------------------
// projetos.projects
// ---------------------------------------------------------------------------
export const projects = projetosSchema.table(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    tipo: projectTypeEnum("tipo").notNull(),
    stage: projectStageEnum("stage").notNull().default("rascunho"),

    // Relationships
    categoryId: uuid("category_id").references(() => projectCategories.id, {
      onDelete: "set null",
    }),
    editalId: uuid("edital_id").references(() => editals.id, {
      onDelete: "set null",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    submitterId: uuid("submitter_id")
      .notNull()
      .references(() => users.id),
    // renovação/continuação: nova entrada vinculada via parent_project_id
    parentProjectId: uuid("parent_project_id").references(
      (): AnyPgColumn => projects.id,
      { onDelete: "set null" },
    ),

    // Content fields
    objectives: text("objectives"),
    justification: text("justification"),
    targetAudience: text("target_audience"),
    expectedResults: text("expected_results"),
    ministryRegion: text("ministry_region"),
    ministryArea: text("ministry_area"),

    // Financial
    budgetTotal: numeric("budget_total", { precision: 12, scale: 2 }),
    parcelas: integer("parcelas"),
    meses: integer("meses"),
    evaluationYear: integer("evaluation_year"),

    // AI scoring
    scoreAi: numeric("score_ai", { precision: 5, scale: 2 }),
    scoreAiBreakdown:
      jsonb("score_ai_breakdown").$type<Record<string, number>>(),

    // Detecção de duplicidade via embeddings (P-2.14, BRAIN §2/§6.2/§8,
    // PATCH-012). Gerado em submitProject a partir de title+objectives+
    // justification (text-embedding-3-small, 1536 dims). possibleDuplicate/
    // duplicateCandidates são um SNAPSHOT calculado no momento da submissão
    // com o limiar então vigente (admin.system_settings
    // ["projetos_duplicate_threshold"]) — mudar o limiar depois não
    // recalcula projetos já submetidos (critério de aceite P-2.14).
    // Visibilidade: apenas diretor/conselheiro/super_admin (mesma regra de
    // scoreAi/scoreAiBreakdown acima) — nunca ao submissor. Índice HNSW de
    // similaridade de cosseno não é representável no builder Drizzle; vive
    // só na migration SQL (mesmo padrão do EXCLUDE de flats.reservations).
    embedding: vector("embedding", { dimensions: 1536 }),
    possibleDuplicate: boolean("possible_duplicate").notNull().default(false),
    duplicateCandidates: jsonb("duplicate_candidates").$type<
      DuplicateCandidateSnapshot[]
    >(),

    // Stage timestamps
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    concludedAt: timestamp("concluded_at", { withTimezone: true }),

    // Soft-delete (imutabilidade)
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_stage_idx").on(table.stage),
    index("projects_tipo_idx").on(table.tipo),
    index("projects_submitter_id_idx").on(table.submitterId),
    index("projects_organization_id_idx").on(table.organizationId),
    index("projects_edital_id_idx").on(table.editalId),
    index("projects_category_id_idx").on(table.categoryId),
    index("projects_parent_project_id_idx").on(table.parentProjectId),
    index("projects_evaluation_year_idx").on(table.evaluationYear),
    index("projects_deleted_at_idx").on(table.deletedAt),
  ],
);

// ---------------------------------------------------------------------------
// projetos.project_versions — snapshots imutáveis a cada mudança de stage
// ---------------------------------------------------------------------------
export const projectVersions = projetosSchema.table(
  "project_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    stage: projectStageEnum("stage").notNull(),
    data: jsonb("data").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_versions_project_id_idx").on(table.projectId),
    unique("project_versions_project_version_uniq").on(
      table.projectId,
      table.versionNumber,
    ),
  ],
);

// ---------------------------------------------------------------------------
// projetos.compact_versions — versão compacta gerada por IA para avaliadores
// ---------------------------------------------------------------------------
export const compactVersions = projetosSchema.table(
  "compact_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    generatedBy: text("generated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("compact_versions_project_id_idx").on(table.projectId)],
);

// ---------------------------------------------------------------------------
// projetos.evaluations — avaliação por diretor avaliador designado
// ---------------------------------------------------------------------------
export const evaluations = projetosSchema.table(
  "evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    evaluatorId: uuid("evaluator_id")
      .notNull()
      .references(() => users.id),
    score: numeric("score", { precision: 5, scale: 2 }),
    scoreBreakdown: jsonb("score_breakdown").$type<Record<string, number>>(),
    recommendation: evaluationRecommendationEnum("recommendation"),
    notes: text("notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("evaluations_project_id_idx").on(table.projectId),
    index("evaluations_evaluator_id_idx").on(table.evaluatorId),
    unique("evaluations_project_evaluator_uniq").on(
      table.projectId,
      table.evaluatorId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// projetos.votes — votação secreta (pergunta: "Você sente paz em investir?")
// RLS: apenas super_admin/diretor podem fazer SELECT; qualquer conselheiro pode INSERT o próprio.
// ---------------------------------------------------------------------------
export const votes = projetosSchema.table(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    value: boolean("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("votes_project_id_idx").on(table.projectId),
    // 1 voto por pessoa por projeto
    unique("votes_project_user_uniq").on(table.projectId, table.userId),
  ],
);

// ---------------------------------------------------------------------------
// projetos.contestations — contestação de resultado de votação
// Trigger no banco garante máximo 2 por projeto; UNIQUE garante 1 por pessoa.
// ---------------------------------------------------------------------------
export const contestations = projetosSchema.table(
  "contestations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    justification: text("justification").notNull(),
    status: contestationStatusEnum("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("contestations_project_id_idx").on(table.projectId),
    // 1 contestação por pessoa por projeto
    unique("contestations_project_user_uniq").on(table.projectId, table.userId),
  ],
);

// ---------------------------------------------------------------------------
// projetos.reports — relatórios periódicos de execução (padrão trimestral)
// ---------------------------------------------------------------------------
export const reports = projetosSchema.table(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    content: text("content"),
    status: reportStatusEnum("status").notNull().default("pendente"),
    dueDate: date("due_date"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    submittedBy: uuid("submitted_by").references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Parecer do diretor na revisão (P-2.6b): obrigatório na rejeição, opcional
    // na aprovação. Preservado quando a rejeição reabre o ciclo (imutabilidade)
    // até a próxima revisão sobrescrever.
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reports_project_id_idx").on(table.projectId),
    index("reports_status_idx").on(table.status),
    index("reports_due_date_idx").on(table.dueDate),
  ],
);

// ---------------------------------------------------------------------------
// projetos.report_attachments
// ---------------------------------------------------------------------------
export const reportAttachments = projetosSchema.table(
  "report_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("report_attachments_report_id_idx").on(table.reportId)],
);

// ---------------------------------------------------------------------------
// projetos.payment_schedules — parcelas geradas na aprovação do projeto
// ---------------------------------------------------------------------------
export const paymentSchedules = projetosSchema.table(
  "payment_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    month: integer("month").notNull(),
    dueDate: date("due_date").notNull(),
    status: paymentStatusEnum("status").notNull().default("pendente"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_schedules_project_id_idx").on(table.projectId),
    index("payment_schedules_due_date_idx").on(table.dueDate),
    index("payment_schedules_status_idx").on(table.status),
  ],
);

// ---------------------------------------------------------------------------
// projetos.project_attachments — docs attached at submission time
// ---------------------------------------------------------------------------
export const projectAttachments = projetosSchema.table(
  "project_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("project_attachments_project_id_idx").on(table.projectId)],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type ProjectCategory = typeof projectCategories.$inferSelect;
export type NewProjectCategory = typeof projectCategories.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectVersion = typeof projectVersions.$inferSelect;
export type NewProjectVersion = typeof projectVersions.$inferInsert;
export type CompactVersion = typeof compactVersions.$inferSelect;
export type NewCompactVersion = typeof compactVersions.$inferInsert;
export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Contestation = typeof contestations.$inferSelect;
export type NewContestation = typeof contestations.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type ReportAttachment = typeof reportAttachments.$inferSelect;
export type NewReportAttachment = typeof reportAttachments.$inferInsert;
export type ProjectAttachment = typeof projectAttachments.$inferSelect;
export type NewProjectAttachment = typeof projectAttachments.$inferInsert;
export type PaymentSchedule = typeof paymentSchedules.$inferSelect;
export type NewPaymentSchedule = typeof paymentSchedules.$inferInsert;
