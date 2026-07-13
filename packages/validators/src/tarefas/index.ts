import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

const workspaceEnum = z.enum([
  "administrativo",
  "financeiro",
  "contabil_fiscal",
  "eclesiastico",
  "comunicacao",
  "tecnologia_inovacao",
]);

const taskPriorityEnum = z.enum(["baixa", "media", "alta", "urgente"]);

const taskStatusEnum = z.enum([
  "a_fazer",
  "em_progresso",
  "em_revisao",
  "concluido",
]);

const recurrenceTypeEnum = z.enum(["diaria", "semanal", "mensal", "anual"]);

const tagColorEnum = z.enum(["blue", "orange", "green", "cyan", "neutral"]);

// ─── recurrenceRuleSchema ─────────────────────────────────────────────────────
// dayOfWeek exigido para "semanal"; dayOfMonth exigido para "mensal"/"anual".

export const recurrenceRuleSchema = z
  .object({
    type: recurrenceTypeEnum,
    interval: z.number().int().min(1, "Intervalo mínimo é 1"),
    dayOfWeek: z
      .number()
      .int()
      .min(0)
      .max(6)
      .nullable()
      .optional()
      .default(null),
    dayOfMonth: z
      .number()
      .int()
      .min(1)
      .max(31)
      .nullable()
      .optional()
      .default(null),
    endDate: z.coerce.date().nullable().optional().default(null),
  })
  .refine((rule) => rule.type !== "semanal" || rule.dayOfWeek !== null, {
    message: "Informe o dia da semana para recorrência semanal",
    path: ["dayOfWeek"],
  })
  .refine(
    (rule) =>
      (rule.type !== "mensal" && rule.type !== "anual") ||
      rule.dayOfMonth !== null,
    {
      message: "Informe o dia do mês para recorrência mensal ou anual",
      path: ["dayOfMonth"],
    },
  );

export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;

// ─── createTaskSchema ─────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Título deve ter pelo menos 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  description: z.string().max(5000).nullable().optional().default(null),
  workspace: workspaceEnum,
  priority: taskPriorityEnum,
  dueDate: z.coerce.date().nullable().optional().default(null),
  assigneeIds: z.array(z.string().uuid()).optional().default([]),
  tagIds: z.array(z.string().uuid()).optional().default([]),
  recurrenceRule: recurrenceRuleSchema.nullable().optional().default(null),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ─── updateTaskStatusSchema ───────────────────────────────────────────────────
// Avanço direto (sem aprovação). Avanços que exigem diretor usam
// requestApprovalSchema / resolveApprovalRequestSchema abaixo.

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: taskStatusEnum,
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

// ─── createSubtaskSchema ──────────────────────────────────────────────────────

export const createSubtaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(2, "Título é obrigatório").max(300),
  assigneeId: z.string().uuid().nullable().optional().default(null),
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

// ─── toggleSubtaskSchema ──────────────────────────────────────────────────────

export const toggleSubtaskSchema = z.object({
  subtaskId: z.string().uuid(),
  isDone: z.boolean(),
});

export type ToggleSubtaskInput = z.infer<typeof toggleSubtaskSchema>;

// ─── createCommentSchema ──────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  taskId: z.string().uuid(),
  content: z
    .string()
    .min(1, "Comentário não pode ser vazio")
    .max(3000, "Comentário deve ter no máximo 3000 caracteres"),
  mentions: z.array(z.string().uuid()).optional().default([]),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ─── createTagSchema ──────────────────────────────────────────────────────────

export const createTagSchema = z.object({
  name: z.string().min(2, "Nome da etiqueta é obrigatório").max(50),
  color: tagColorEnum,
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

// ─── createAttachmentSchema ───────────────────────────────────────────────────

export const createAttachmentSchema = z.object({
  parentType: z.enum(["task", "comment"]),
  parentId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1).max(150),
});

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;

// ─── createTimeEntrySchema ────────────────────────────────────────────────────

export const createTimeEntrySchema = z.object({
  taskId: z.string().uuid(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable().optional().default(null),
  notes: z.string().max(1000).nullable().optional().default(null),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

// ─── requestApprovalSchema ────────────────────────────────────────────────────
// Diretor não recebe tarefa operacional — recebe o pedido de aprovação
// para avançar o status (BRAIN §6.9).

export const requestApprovalSchema = z.object({
  taskId: z.string().uuid(),
  requestedStatus: taskStatusEnum,
  approverId: z.string().uuid("Selecione um diretor aprovador"),
  notes: z.string().max(500).nullable().optional().default(null),
});

export type RequestApprovalInput = z.infer<typeof requestApprovalSchema>;

// ─── resolveApprovalRequestSchema ─────────────────────────────────────────────

export const resolveApprovalRequestSchema = z.object({
  approvalRequestId: z.string().uuid(),
  decision: z.enum(["aprovado", "rejeitado"]),
  notes: z.string().max(500).nullable().optional().default(null),
});

export type ResolveApprovalRequestInput = z.infer<
  typeof resolveApprovalRequestSchema
>;

// ─── createTaskTemplateSchema ─────────────────────────────────────────────────

const taskTemplateItemSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).nullable().optional().default(null),
  priority: taskPriorityEnum,
  dueOffsetDays: z.number().int().min(0).nullable().optional().default(null),
  subtasks: z.array(z.string().min(1).max(300)).optional().default([]),
});

const taskTemplateTriggerSchema = z.object({
  sourceModule: z.string().min(1).max(50),
  event: z.string().min(1).max(100),
});

export const createTaskTemplateSchema = z.object({
  name: z.string().min(3, "Nome do template é obrigatório").max(200),
  description: z.string().max(1000).nullable().optional().default(null),
  workspace: workspaceEnum,
  tasks: z
    .array(taskTemplateItemSchema)
    .min(1, "Adicione pelo menos uma tarefa ao template"),
  trigger: taskTemplateTriggerSchema.nullable().optional().default(null),
});

export type CreateTaskTemplateInput = z.infer<typeof createTaskTemplateSchema>;

// ─── updateTaskTemplateSchema ─────────────────────────────────────────────────
// Mesma forma de createTaskTemplate + o id do template. A action substitui os
// template_items por completo (P-4.9b).

export const updateTaskTemplateSchema = createTaskTemplateSchema.extend({
  templateId: z.string().uuid(),
});

export type UpdateTaskTemplateInput = z.infer<typeof updateTaskTemplateSchema>;

// ─── toggleTaskTemplateSchema ─────────────────────────────────────────────────
// Ativa/desativa um template. Template inativo não pode ser instanciado
// (BRAIN §6.9) — o gate é reforçado na action instantiateTaskTemplate.

export const toggleTaskTemplateSchema = z.object({
  templateId: z.string().uuid(),
  isActive: z.boolean(),
});

export type ToggleTaskTemplateInput = z.infer<typeof toggleTaskTemplateSchema>;

// ─── Re-export enums for shared use ───────────────────────────────────────────

export {
  workspaceEnum,
  taskPriorityEnum,
  taskStatusEnum,
  recurrenceTypeEnum,
  tagColorEnum,
};
