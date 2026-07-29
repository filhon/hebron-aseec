import { and, eq, isNull, lt } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { costCenters, payables, reports } from "@hebron/db/schema";
import { logAudit } from "@hebron/db/audit";
import { getSystemActorId } from "@hebron/db/system-actor";
import { notifyProjectBlocked } from "../notify/projetos";
import { inngest } from "../client";

/**
 * Motivo de bloqueio gravado em `payables.block_reason` — único valor hoje
 * (relatório vencido), mas mantido como string dedicada (não boolean) para
 * comportar outros motivos de bloqueio no futuro sem migration.
 */
const BLOCK_REASON_REPORT_OVERDUE = "relatorio_vencido";

function todayUTC(): string {
  const iso = new Date().toISOString().split("T")[0];
  if (!iso) throw new Error("Invalid date");
  return iso;
}

/**
 * Bloqueio por inadimplência de relatório (BRAIN §6.2: "Inadimplência
 * bloqueia pagamentos, super_admin pode sobrescrever"). "Vencido" aqui é
 * `due_date` já passada e o relatório ainda "pendente" — não há decisão
 * prévia do Filipe sobre um período de carência específico para o
 * bloqueio (diferente do REPORT_EXPIRY_GRACE_DAYS de 30 dias usado só para
 * o 3º lembrete em crons/projetos.ts), então o bloqueio age assim que o
 * relatório vence, documentado aqui — não silenciosamente.
 *
 * Só bloqueia payables ainda "pendente" (antes de entrar no fluxo de
 * governança dual) — um payable já "aprovado"/"autorizado" segue seu curso;
 * bloquear seria alterar decisões já tomadas por um diretor/autorizador, o
 * que este cron não tem mandato para fazer. Isso também é o suficiente para
 * satisfazer "payable bloqueado não entra em lote semanal", já que o lote
 * (runWeeklyBatchCreation, crons/financeiro.ts) só seleciona status
 * "pendente" — "bloqueado" já fica de fora automaticamente.
 *
 * Idempotente: só bloqueia payables que ainda não estão bloqueados
 * (status = "pendente" é a única condição de entrada).
 */
export async function runProjetosInadimplenciaCheck(): Promise<{
  blockedPayableIds: string[];
}> {
  const actorId = await getSystemActorId();
  const today = todayUTC();

  const overdueReports = await db
    .select({ projectId: reports.projectId })
    .from(reports)
    .where(and(eq(reports.status, "pendente"), lt(reports.dueDate, today)));

  const projectIds = [...new Set(overdueReports.map((r) => r.projectId))];
  const blockedPayableIds: string[] = [];

  for (const projectId of projectIds) {
    const [costCenter] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, projectId))
      .limit(1);
    if (!costCenter) continue; // projeto ainda sem centro de custo — nada a bloquear

    const blockable = await db
      .select({ id: payables.id })
      .from(payables)
      .where(
        and(
          eq(payables.costCenterId, costCenter.id),
          eq(payables.status, "pendente"),
          isNull(payables.deletedAt),
        ),
      );

    if (!blockable.length) continue; // nada pendente para bloquear hoje

    for (const payable of blockable) {
      const now = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(payables)
          .set({
            status: "bloqueado",
            blockedAt: now,
            blockReason: BLOCK_REASON_REPORT_OVERDUE,
            updatedAt: now,
          })
          .where(eq(payables.id, payable.id));

        await logAudit(
          {
            actorId,
            action: "financeiro.payable.blocked",
            entity: "payable",
            entityId: payable.id,
            diff: { projectId, reason: BLOCK_REASON_REPORT_OVERDUE },
          },
          tx,
        );
      });
      blockedPayableIds.push(payable.id);
    }

    // Notificação (P-2.10b) — best-effort, fora da transação de bloqueio: a
    // falha de um email/in_app não deve desfazer o bloqueio já auditado.
    // `blockable` já filtra status = "pendente", então isto só dispara em
    // dias com bloqueio novo — idempotente por construção, sem precisar de
    // uma tabela de "já notificado".
    try {
      await notifyProjectBlocked(projectId);
    } catch (err) {
      console.error(
        "[jobs/projetos-inadimplencia] notifyProjectBlocked failed:",
        err,
      );
    }
  }

  return { blockedPayableIds };
}

export const projetosInadimplenciaCron = inngest.createFunction(
  {
    id: "projetos-inadimplencia",
    name: "Projetos: bloqueio de payables por relatório de projeto vencido",
  },
  // Roda de madrugada, antes do lote semanal de segunda 8h
  // (weeklyBatchCreationCron, crons/financeiro.ts) — garante que payables
  // recém-bloqueados já fiquem de fora do próximo lote.
  { cron: "0 5 * * *" },
  async ({ step }) =>
    step.run("run-projetos-inadimplencia", runProjetosInadimplenciaCheck),
);
