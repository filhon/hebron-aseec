import { and, eq, isNull, ne, not, sql, sum } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { organizationBudgets, projects } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// checkOrganizationBudget — Projetos → Financeiro
//
// Consome financeiro.organization_budgets (P-3.8b / PATCH-009) para aplicar
// o teto de orçamento por instituição/ano (BRAIN §6.2). Movida de
// apps/projetos/src/actions/projects.ts para packages/integrations (P-0.15 —
// P-3.11): a lógica já lia a tabela dedicada desde P-3.8b, mas ainda vivia
// dentro do app, em vez de exposta como integração cross-app — a última
// peça do workaround admin.system_settings (S-40) a ser removida era essa
// localização arquitetural, não mais a leitura em si (ver PATCH-013).
// ---------------------------------------------------------------------------

async function getBudgetLimit(
  organizationId: string,
  year: number,
): Promise<number | null> {
  const budgetRows = await db
    .select({ amount: organizationBudgets.amount })
    .from(organizationBudgets)
    .where(
      and(
        eq(organizationBudgets.organizationId, organizationId),
        eq(organizationBudgets.year, year),
      ),
    )
    .limit(1);

  if (!budgetRows[0]) return null; // No budget configured — no cap

  const limit = parseFloat(budgetRows[0].amount);
  return limit || null;
}

// P-2.15 CORRETIVO: comprometido soma o valor APROVADO quando existe — sem
// isso, aprovar R$ 30 mil de um pedido de R$ 50 mil deixava o teto da
// instituição consumido pelos R$ 50 mil pedidos, não pelos R$ 30 mil
// concedidos. Fallback para budgetTotal preserva o cálculo de projetos ainda
// não decididos (e de projetos aprovados antes da migration 0093).
//
// `excludeProjectId` existe só para o painel de decisão (registerProjectDecision):
// o projeto sendo decidido já está em `projects` (stage validacao/homologacao,
// portanto contado por este SELECT via budgetTotal) — sem excluí-lo, checar o
// novo `approvedAmount` somaria o mesmo projeto duas vezes.
async function getCommittedBudget(
  organizationId: string,
  year: number,
  excludeProjectId?: string,
): Promise<number> {
  const existingResult = await db
    .select({
      total: sum(
        sql`coalesce(${projects.approvedAmount}, ${projects.budgetTotal})`,
      ),
    })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.evaluationYear, year),
        isNull(projects.deletedAt),
        not(eq(projects.stage, "reprovado")),
        excludeProjectId ? ne(projects.id, excludeProjectId) : undefined,
      ),
    );

  return parseFloat(existingResult[0]?.total ?? "0");
}

export async function checkOrganizationBudget(
  organizationId: string,
  year: number,
  newProjectBudget: number,
  excludeProjectId?: string,
): Promise<void> {
  const limit = await getBudgetLimit(organizationId, year);
  if (limit === null) return;

  const totalExisting = await getCommittedBudget(
    organizationId,
    year,
    excludeProjectId,
  );

  if (totalExisting + newProjectBudget > limit) {
    throw new Error(
      `Orçamento da instituição excedido para ${year}. Contate o administrador.`,
    );
  }
}

// ---------------------------------------------------------------------------
// getOrganizationBudgetStatus — leitura para exibição (irmã de checkOrganizationBudget)
//
// Mesma fonte e mesma consulta usadas para bloquear a submissão (P-2.3c):
// financeiro.organization_budgets para o teto, projects (deleted_at IS NULL,
// excluindo reprovado) para o comprometido. `limit: null` = sem orçamento
// configurado para a instituição/ano — BRAIN §6.2: nesse caso não há teto.
// ---------------------------------------------------------------------------

export type OrganizationBudgetStatus = {
  limit: number | null;
  committed: number;
};

export async function getOrganizationBudgetStatus(
  organizationId: string,
  year: number,
): Promise<OrganizationBudgetStatus> {
  const [limit, committed] = await Promise.all([
    getBudgetLimit(organizationId, year),
    getCommittedBudget(organizationId, year),
  ]);

  return { limit, committed };
}
