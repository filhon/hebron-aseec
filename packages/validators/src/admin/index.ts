import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

const roleEnum = z.enum([
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
  "submissor",
  "aluno",
  "hospede",
  "ouvinte",
]);

const scopeEnum = z.enum([
  "global",
  "admin",
  "projetos",
  "plataforma",
  "radio",
  "financeiro",
  "intranet",
  "documentos",
  "flats",
  "tarefas",
]);

// ─── createUserSchema ─────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  email: z.string().email("Email inválido"),
  role: roleEnum,
  sendInvite: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ─── updateUserSchema ─────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  status: z.enum(["active", "suspended", "pending_approval"]).optional(),
  moduleAccess: z.array(scopeEnum).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ─── createInvitationSchema ───────────────────────────────────────────────────

export const createInvitationSchema = z.object({
  email: z.string().email("Email inválido"),
  role: roleEnum,
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// ─── updateSettingSchema ──────────────────────────────────────────────────────

export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

// ─── createUserExtendedSchema ─────────────────────────────────────────────────
// Versão estendida para o formulário admin: múltiplos papéis + controle de módulos

export const createUserExtendedSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  email: z.string().email("Email inválido"),
  roles: z.array(roleEnum).min(1, "Selecione pelo menos um papel"),
  moduleAccess: z.array(scopeEnum).optional(),
  sendInvite: z.boolean().optional(),
});

export type CreateUserExtendedInput = z.infer<typeof createUserExtendedSchema>;

// ─── updateUserExtendedSchema ─────────────────────────────────────────────────

export const updateUserExtendedSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(120)
    .optional(),
  status: z.enum(["active", "suspended", "pending_approval"]).optional(),
  roles: z.array(roleEnum).min(1, "Selecione pelo menos um papel").optional(),
  moduleAccess: z.array(scopeEnum).optional(),
});

export type UpdateUserExtendedInput = z.infer<typeof updateUserExtendedSchema>;

// ─── createInvitationExtendedSchema ──────────────────────────────────────────

export const createInvitationExtendedSchema = z.object({
  email: z.string().email("Email inválido"),
  roles: z.array(roleEnum).min(1, "Selecione pelo menos um papel"),
  message: z
    .string()
    .max(500, "Mensagem deve ter no máximo 500 caracteres")
    .optional(),
  expiresInDays: z
    .number()
    .int()
    .min(1, "Mínimo 1 dia")
    .max(30, "Máximo 30 dias"),
});

export type CreateInvitationExtendedInput = z.infer<
  typeof createInvitationExtendedSchema
>;

// ─── roleAssignmentSchema ─────────────────────────────────────────────────────

export const roleAssignmentSchema = z.object({
  userId: z.string().min(1, "Selecione um usuário"),
  role: roleEnum,
  scope: scopeEnum,
});

export type RoleAssignmentInput = z.infer<typeof roleAssignmentSchema>;

// ─── roleRevocationSchema ─────────────────────────────────────────────────────

export const roleRevocationSchema = z.object({
  assignmentId: z.string().min(1, "ID de atribuição inválido"),
  reason: z.string().max(500).optional(),
});

export type RoleRevocationInput = z.infer<typeof roleRevocationSchema>;

// ─── designationSchema ────────────────────────────────────────────────────────
// Designações são por função (gestor/autorizador), nunca por escopo arbitrário
// — ver BRAIN.md §"Designações especiais". PATCH-021.

export const designationSchema = z.object({
  userId: z.string().min(1, "Selecione um diretor"),
  type: z.enum(["gestor", "autorizador"]),
});

export type DesignationInput = z.infer<typeof designationSchema>;

// ─── emailTemplateSchema ──────────────────────────────────────────────────────

export const emailTemplateSchema = z.object({
  key: z.string().min(1),
  subject: z
    .string()
    .min(3, "Assunto deve ter pelo menos 3 caracteres")
    .max(200),
  bodyHtml: z.string().min(10, "Corpo HTML deve ter pelo menos 10 caracteres"),
  bodyText: z.string().min(10, "Corpo texto deve ter pelo menos 10 caracteres"),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

// ─── meetingSchema ────────────────────────────────────────────────────────────

export const meetingSchema = z.object({
  date: z.string().min(1, "Selecione a data da reunião"),
  type: z.enum(["mensal", "ordinaria", "extraordinaria"]),
  chairUserId: z.string().min(1, "Selecione o presidente"),
  notes: z
    .string()
    .max(2000, "Notas devem ter no máximo 2000 caracteres")
    .optional(),
});

export type MeetingInput = z.infer<typeof meetingSchema>;
