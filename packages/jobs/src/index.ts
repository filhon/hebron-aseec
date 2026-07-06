export { inngest } from "./client";

import { ensureMonthlyMeetingsCron } from "./crons/admin";
import { editalClosingRemindersCron } from "./crons/documentos";
import {
  evaluationRemindersCron,
  homologacaoAutoApproveCron,
  reportRemindersCron,
} from "./crons/projetos";

/**
 * Todas as funções Inngest registradas — consumidas pela rota de serve
 * (`apps/intranet/src/app/api/inngest/route.ts`). Adicionar aqui é o
 * "registro no catálogo" que G6.6 (PROMPTS.md) exige de todo cron novo.
 */
export const functions = [
  ensureMonthlyMeetingsCron,
  editalClosingRemindersCron,
  reportRemindersCron,
  evaluationRemindersCron,
  homologacaoAutoApproveCron,
];

export { PLANNED_JOBS } from "./catalog";
export type { PlannedJob } from "./catalog";
