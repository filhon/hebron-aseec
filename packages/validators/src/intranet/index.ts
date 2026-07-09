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

const dashboardWidgetSchema = z.object({
  id: z.string().uuid(),
  type: dashboardWidgetTypeEnum,
  position: z.number().int().min(0),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateDashboardWidgetsSchema = z.object({
  widgets: z.array(dashboardWidgetSchema),
});

export type UpdateDashboardWidgetsInput = z.infer<
  typeof updateDashboardWidgetsSchema
>;

// ─── createDirectoryMemberSchema ──────────────────────────────────────────────

export const createDirectoryMemberSchema = z.object({
  userId: z.string().uuid().nullable().optional().default(null),
  name: z.string().min(2, "Nome é obrigatório").max(200),
  role: z.string().min(2, "Papel é obrigatório").max(150),
  email: z.string().email("E-mail inválido"),
  phone: z.string().max(30).nullable().optional().default(null),
  bio: z.string().max(2000).nullable().optional().default(null),
});

export type CreateDirectoryMemberInput = z.infer<
  typeof createDirectoryMemberSchema
>;

// ─── createCalendarEventSchema ────────────────────────────────────────────────

export const createCalendarEventSchema = z
  .object({
    title: z.string().min(3, "Título é obrigatório").max(200),
    description: z.string().max(2000).nullable().optional().default(null),
    type: calendarEventTypeEnum,
    startAt: z.coerce.date(),
    endAt: z.coerce.date().nullable().optional().default(null),
    location: z.string().max(200).nullable().optional().default(null),
    meetingSessionId: z.string().uuid().nullable().optional().default(null),
  })
  .refine((event) => !event.endAt || event.endAt >= event.startAt, {
    message: "Data de término não pode ser antes da data de início",
    path: ["endAt"],
  });

export type CreateCalendarEventInput = z.infer<
  typeof createCalendarEventSchema
>;

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

// ─── Re-export enums for shared use ───────────────────────────────────────────

export {
  announcementPriorityEnum,
  dashboardWidgetTypeEnum,
  calendarEventTypeEnum,
  meetingDecisionStatusEnum,
};
