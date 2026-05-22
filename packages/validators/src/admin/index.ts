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
