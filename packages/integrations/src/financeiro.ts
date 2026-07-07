import { and, eq, sum } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { costCenters, transactions } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// getProjectBudgetExecution — Financeiro → Projetos
//
// Executado vs orçado em tempo real para o centro de custo de um projeto
// aprovado. "Executado" soma os lançamentos de débito (financeiro.
// transactions) vinculados ao centro de custo — a mesma fonte usada pelo
// alerta de 80% de execução orçamentária (checkBudgetAlert, P-3.10). Não há
// centro de custo até o projeto ser aprovado (onProjectApproved) — retorna
// null nesse caso, cabendo ao chamador decidir como exibir "sem execução".
// ---------------------------------------------------------------------------

export interface ProjectBudgetExecution {
  projectId: string;
  costCenterId: string;
  budgetTotal: number;
  executedTotal: number;
  remaining: number;
  percentExecuted: number;
}

export async function getProjectBudgetExecution(
  projectId: string,
): Promise<ProjectBudgetExecution | null> {
  const [costCenter] = await db
    .select({ id: costCenters.id, budgetTotal: costCenters.budgetTotal })
    .from(costCenters)
    .where(eq(costCenters.projectId, projectId))
    .limit(1);

  if (!costCenter) return null;

  const [result] = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(
      and(
        eq(transactions.costCenterId, costCenter.id),
        eq(transactions.type, "debito"),
      ),
    );

  const budgetTotal = parseFloat(costCenter.budgetTotal);
  const executedTotal = parseFloat(result?.total ?? "0");

  return {
    projectId,
    costCenterId: costCenter.id,
    budgetTotal,
    executedTotal,
    remaining: budgetTotal - executedTotal,
    percentExecuted: budgetTotal > 0 ? (executedTotal / budgetTotal) * 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// onFlatsAssistanceApproved — Flats → Financeiro
//
// Stub: a integração real nasce quando o módulo Flats for construído
// (Fase 7, P-7.x — CS-6 da auditoria). Comportamento esperado (BRAIN.md,
// tabela de integrações cross-app §"Flats → Financeiro"):
//   Auxílio (ajuda de custo) aprovado cria uma despesa automática no
//   Financeiro (financeiro.payables), com dueDate = dia anterior ao
//   check-in da reserva.
//
// Uma vez implementada de verdade, esta função escreve em outro schema — o
// chamador deve `await` (nunca fire-and-forget), mesmo que a decisão de
// negócio seja não bloquear a aprovação do auxílio por causa de uma falha
// aqui (mesmo padrão documentado em onProjectSubmitted, projetos-tarefas.ts).
// ---------------------------------------------------------------------------

export async function onFlatsAssistanceApproved(
  reservationId: string,
): Promise<void> {
  // Stub — nenhuma ação real até que o módulo flats seja construído.
  console.info(
    `[integrations/financeiro] stub — despesa automática de auxílio pendente para reservationId=${reservationId}`,
  );
}
