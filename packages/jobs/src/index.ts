export { inngest } from "./client";

import { ensureMonthlyMeetingsCron } from "./crons/admin";
import { editalClosingRemindersCron } from "./crons/documentos";
import {
  dueDateRemindersCron,
  monthlyReportCron,
  weeklyBatchCreationCron,
} from "./crons/financeiro";
import {
  evaluationRemindersCron,
  homologacaoAutoApproveCron,
  reportRemindersCron,
} from "./crons/projetos";
import { projetosInadimplenciaCron } from "./crons/projetos-inadimplencia";
import { kpiSnapshotCron } from "./crons/intranet";
import { briefingCron } from "./crons/briefing";
import { tarefasRecurrenceCron } from "./crons/tarefas";
import { tarefasPrazosCron } from "./crons/tarefas-prazos";

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
  projetosInadimplenciaCron,
  weeklyBatchCreationCron,
  dueDateRemindersCron,
  monthlyReportCron,
  tarefasRecurrenceCron,
  tarefasPrazosCron,
  kpiSnapshotCron,
  briefingCron,
];

export { PLANNED_JOBS } from "./catalog";
export type { PlannedJob } from "./catalog";
