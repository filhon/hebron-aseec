import {
  boolean,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tarefasSchema, users } from "./public";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
// 6 workspaces fixos (BRAIN §6.9) — sem workspaces custom na v1.
export const workspaceSlugEnum = tarefasSchema.enum("workspace_slug", [
  "administrativo",
  "financeiro",
  "contabil_fiscal",
  "eclesiastico",
  "comunicacao",
  "tecnologia_inovacao",
]);

export const taskPriorityEnum = tarefasSchema.enum("task_priority", [
  "baixa",
  "media",
  "alta",
  "urgente",
]);

// 4 status fixos (BRAIN §6.9) — colunas do Kanban não são customizáveis.
export const taskStatusEnum = tarefasSchema.enum("task_status", [
  "a_fazer",
  "em_progresso",
  "em_revisao",
  "concluido",
]);

// manual = criada por um colaborador; auto = gerada por outro módulo
// (source_ref guarda { sourceModule, sourceId } — super_admin atribui
// responsável manualmente depois, ver needs_manual_assignment).
export const taskSourceEnum = tarefasSchema.enum("task_source", [
  "manual",
  "auto",
]);

export const recurrenceTypeEnum = tarefasSchema.enum("recurrence_type", [
  "diaria",
  "semanal",
  "mensal",
  "anual",
]);

export const tagColorEnum = tarefasSchema.enum("tag_color", [
  "blue",
  "orange",
  "green",
  "cyan",
  "neutral",
]);

export const attachmentParentTypeEnum = tarefasSchema.enum(
  "attachment_parent_type",
  ["task", "comment"],
);

// Diretores não recebem tarefas operacionais — só pedidos de aprovação
// para avançar o status de uma tarefa (BRAIN §6.9).
export const approvalRequestStatusEnum = tarefasSchema.enum(
  "approval_request_status",
  ["pendente", "aprovado", "rejeitado"],
);

// ---------------------------------------------------------------------------
// tarefas.workspaces — 6 fixos, seed na migration (BRAIN §6.9). Sem rota de
// criação — nenhum papel pode inserir linha nesta tabela em runtime.
// ---------------------------------------------------------------------------
export const workspaces = tarefasSchema.table("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: workspaceSlugEnum("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// tarefas.tags
// ---------------------------------------------------------------------------
export const tags = tarefasSchema.table("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: tagColorEnum("color").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// tarefas.tasks
// Imutabilidade: soft-delete via deleted_at, nunca hard delete.
// ---------------------------------------------------------------------------
export const tasks = tarefasSchema.table(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    status: taskStatusEnum("status").notNull().default("a_fazer"),
    priority: taskPriorityEnum("priority").notNull().default("media"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    source: taskSourceEnum("source").notNull().default("manual"),
    // { sourceModule: string; sourceId: string } quando source = 'auto'
    // (ex.: { sourceModule: "flats", sourceId: "reserva-123" }).
    sourceRef: jsonb("source_ref").$type<{
      sourceModule: string;
      sourceId: string;
    }>(),
    // Tarefas automáticas nascem sem responsável — super_admin atribui
    // manualmente (BRAIN §6.9).
    needsManualAssignment: boolean("needs_manual_assignment")
      .notNull()
      .default(false),
    // Tarefa/template que originou esta instância, quando gerada por recorrência.
    recurrenceParentId: uuid("recurrence_parent_id"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tasks_workspace_id_idx").on(table.workspaceId),
    index("tasks_status_idx").on(table.status),
    index("tasks_created_by_idx").on(table.createdBy),
    index("tasks_due_date_idx").on(table.dueDate),
    index("tasks_deleted_at_idx").on(table.deletedAt),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.subtasks
// ---------------------------------------------------------------------------
export const subtasks = tarefasSchema.table(
  "subtasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("subtasks_task_id_idx").on(table.taskId)],
);

// ---------------------------------------------------------------------------
// tarefas.assignees — many-to-many task <-> user
// ---------------------------------------------------------------------------
export const assignees = tarefasSchema.table(
  "assignees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("assignees_task_id_idx").on(table.taskId),
    index("assignees_user_id_idx").on(table.userId),
    unique("assignees_task_user_uniq").on(table.taskId, table.userId),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.comments
// ---------------------------------------------------------------------------
export const comments = tarefasSchema.table(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    // User IDs @mencionados no conteúdo.
    mentions: jsonb("mentions").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [index("comments_task_id_idx").on(table.taskId)],
);

// ---------------------------------------------------------------------------
// tarefas.attachments — polimórfico (task/comment)
// ---------------------------------------------------------------------------
export const attachments = tarefasSchema.table(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentType: attachmentParentTypeEnum("parent_type").notNull(),
    parentId: uuid("parent_id").notNull(),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    mimeType: text("mime_type").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("attachments_parent_idx").on(table.parentType, table.parentId),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.time_entries — time tracking opcional (BRAIN §6.9, "features v1")
// ---------------------------------------------------------------------------
export const timeEntries = tarefasSchema.table(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    // Null = cronômetro em andamento.
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
  },
  (table) => [
    index("time_entries_task_id_idx").on(table.taskId),
    index("time_entries_user_id_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.task_tags — join table
// ---------------------------------------------------------------------------
export const taskTags = tarefasSchema.table(
  "task_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("task_tags_task_id_idx").on(table.taskId),
    index("task_tags_tag_id_idx").on(table.tagId),
    unique("task_tags_task_tag_uniq").on(table.taskId, table.tagId),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.task_templates
// ---------------------------------------------------------------------------
export const taskTemplates = tarefasSchema.table(
  "task_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    // Null = disparado manualmente por um colaborador; definido = evento cross-module.
    triggerSourceModule: text("trigger_source_module"),
    triggerEvent: text("trigger_event"),
    isActive: boolean("is_active").notNull().default(true),
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
  (table) => [index("task_templates_workspace_id_idx").on(table.workspaceId)],
);

// ---------------------------------------------------------------------------
// tarefas.template_items — tarefas pré-definidas de um template
// ---------------------------------------------------------------------------
export const templateItems = tarefasSchema.table(
  "template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskTemplateId: uuid("task_template_id")
      .notNull()
      .references(() => taskTemplates.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: taskPriorityEnum("priority").notNull().default("media"),
    // Dias após o disparo do template em que esta tarefa pré-definida vence.
    dueOffsetDays: integer("due_offset_days"),
    // Títulos das subtarefas pré-definidas.
    subtasks: jsonb("subtasks").$type<string[]>().notNull().default([]),
    order: integer("order").notNull().default(0),
  },
  (table) => [
    index("template_items_task_template_id_idx").on(table.taskTemplateId),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.recurrence_rules
// dayOfWeek usado só quando type = "semanal" (0 = domingo .. 6 = sábado).
// dayOfMonth usado só quando type = "mensal" | "anual" (1-31).
// next_run_at: próxima execução planejada — consumido pelo cron (P-4.8).
// ---------------------------------------------------------------------------
export const recurrenceRules = tarefasSchema.table(
  "recurrence_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskTemplateId: uuid("task_template_id")
      .notNull()
      .references(() => taskTemplates.id, { onDelete: "cascade" }),
    type: recurrenceTypeEnum("type").notNull(),
    interval: integer("interval").notNull().default(1),
    dayOfWeek: integer("day_of_week"),
    dayOfMonth: integer("day_of_month"),
    endDate: timestamp("end_date", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("recurrence_rules_task_template_id_idx").on(table.taskTemplateId),
    index("recurrence_rules_next_run_at_idx").on(table.nextRunAt),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.approval_requests — mutação crítica, ver admin.audit_action
// (ALTER TYPE em migration — G6.3).
// ---------------------------------------------------------------------------
export const approvalRequests = tarefasSchema.table(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    // Status que a tarefa avança para, caso aprovado.
    requestedStatus: taskStatusEnum("requested_status").notNull(),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    // Diretor responsável pela aprovação.
    approverId: uuid("approver_id")
      .notNull()
      .references(() => users.id),
    status: approvalRequestStatusEnum("status").notNull().default("pendente"),
    notes: text("notes"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("approval_requests_task_id_idx").on(table.taskId),
    index("approval_requests_approver_id_idx").on(table.approverId),
    index("approval_requests_status_idx").on(table.status),
  ],
);

// ---------------------------------------------------------------------------
// tarefas.task_events — log operacional do dia a dia (diferente de
// admin.audit_log, reservado a mutações críticas — aprovações).
// ---------------------------------------------------------------------------
export const taskEvents = tarefasSchema.table(
  "task_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    eventType: text("event_type").notNull(),
    diff: jsonb("diff"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("task_events_task_id_idx").on(table.taskId),
    index("task_events_created_at_idx").on(table.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Subtask = typeof subtasks.$inferSelect;
export type NewSubtask = typeof subtasks.$inferInsert;
export type Assignee = typeof assignees.$inferSelect;
export type NewAssignee = typeof assignees.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type TaskTag = typeof taskTags.$inferSelect;
export type NewTaskTag = typeof taskTags.$inferInsert;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type NewTaskTemplate = typeof taskTemplates.$inferInsert;
export type TemplateItem = typeof templateItems.$inferSelect;
export type NewTemplateItem = typeof templateItems.$inferInsert;
export type RecurrenceRule = typeof recurrenceRules.$inferSelect;
export type NewRecurrenceRule = typeof recurrenceRules.$inferInsert;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type NewTaskEvent = typeof taskEvents.$inferInsert;
