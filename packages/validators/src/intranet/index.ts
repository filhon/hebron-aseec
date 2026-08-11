import { z } from "zod";

// ─── Shared enums ─────────────────────────────────────────────────────────────

const announcementPriorityEnum = z.enum(["normal", "importante", "urgente"]);

const dashboardWidgetTypeEnum = z.enum(["kpi", "chart", "feed", "calendar"]);

const calendarEventTypeEnum = z.enum(["reuniao", "prazo", "evento", "outro"]);

const meetingDecisionStatusEnum = z.enum([
  "pendente",
  "em_andamento",
  "concluida",
]);

// ─── createAnnouncementSchema ─────────────────────────────────────────────────

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(3, "Título deve ter pelo menos 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  body: z
    .string()
    .min(10, "Corpo do anúncio deve ter pelo menos 10 caracteres"),
  priority: announcementPriorityEnum,
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

// ─── updateAnnouncementSchema ─────────────────────────────────────────────────

export const updateAnnouncementSchema = z.object({
  announcementId: z.string().uuid(),
  title: z
    .string()
    .min(3, "Título deve ter pelo menos 3 caracteres")
    .max(200, "Título deve ter no máximo 200 caracteres"),
  body: z
    .string()
    .min(10, "Corpo do anúncio deve ter pelo menos 10 caracteres"),
  priority: announcementPriorityEnum,
});

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

// ─── updateDashboardWidgetsSchema ─────────────────────────────────────────────
// Salva o arranjo completo de widgets do usuário (reordenar/adicionar/remover).

const dashboardWidgetSchema = z
  .object({
    id: z.string().uuid(),
    type: dashboardWidgetTypeEnum,
    position: z.number().int().min(0),
    config: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .refine(
    (widget) => {
      if (widget.type !== "kpi" && widget.type !== "chart") return true;
      const kpiId = widget.config.kpiId;
      return typeof kpiId === "string" && kpiId.length > 0;
    },
    {
      message: "Selecione um indicador para este widget",
      path: ["config", "kpiId"],
    },
  );

export const updateDashboardWidgetsSchema = z.object({
  widgets: z.array(dashboardWidgetSchema),
});

export type UpdateDashboardWidgetsInput = z.infer<
  typeof updateDashboardWidgetsSchema
>;

// ─── updateMyProfileSchema ─────────────────────────────────────────────────────
// P-5.1b — substitui o antigo schema de cadastro de membro do diretório
// (órfão: descrevia um formulário que nunca foi construído). O titular só
// edita os próprios bio, telefone e avatar — nome/papel/email não são
// autoatendimento.

export const updateMyProfileSchema = z.object({
  bio: z.string().max(2000).nullable().optional().default(null),
  phone: z.string().max(30).nullable().optional().default(null),
  /** Storage path em perfil-avatares (P-5.1b), não uma URL — resolvida sob demanda. */
  avatarPath: z.string().max(500).nullable().optional().default(null),
});

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;

// ─── createMeetingDecisionSchema ──────────────────────────────────────────────

export const createMeetingDecisionSchema = z.object({
  meetingSessionId: z.string().uuid(),
  description: z
    .string()
    .min(3, "Descrição da decisão é obrigatória")
    .max(1000),
  responsibleId: z.string().uuid("Selecione um responsável"),
  dueDate: z.coerce.date().nullable().optional().default(null),
});

export type CreateMeetingDecisionInput = z.infer<
  typeof createMeetingDecisionSchema
>;

// ─── updateMeetingDecisionStatusSchema ────────────────────────────────────────

export const updateMeetingDecisionStatusSchema = z.object({
  meetingDecisionId: z.string().uuid(),
  status: meetingDecisionStatusEnum,
});

export type UpdateMeetingDecisionStatusInput = z.infer<
  typeof updateMeetingDecisionStatusSchema
>;

// ─── briefingPreferenceSchema ──────────────────────────────────────────────────
// P-5.1b — schema oficial que S-88 pediu e P-5.9/P-5.10 não entregaram: existia
// como duas cópias locais (briefing-config-form.tsx e actions/briefing.ts).

export const briefingPreferenceSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["diario", "semanal"]),
});

export type BriefingPreferenceInput = z.infer<typeof briefingPreferenceSchema>;

// ─── Re-export enums for shared use ───────────────────────────────────────────

export {
  announcementPriorityEnum,
  dashboardWidgetTypeEnum,
  calendarEventTypeEnum,
  meetingDecisionStatusEnum,
};
