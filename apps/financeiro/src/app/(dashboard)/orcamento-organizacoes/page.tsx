import { db } from "@hebron/db/client";
import { organizationBudgets, organizations } from "@hebron/db/schema";
import { eq } from "drizzle-orm";
import { requireColaboradorSession } from "../../../lib/session";
import { OrganizationBudgetsManager } from "../../../components/organization-budgets-manager";

export default async function OrcamentoOrganizacoesPage() {
  await requireColaboradorSession();

  const budgets = await db
    .select({
      id: organizationBudgets.id,
      organizationId: organizationBudgets.organizationId,
      organizationName: organizations.nome,
      year: organizationBudgets.year,
      amount: organizationBudgets.amount,
    })
    .from(organizationBudgets)
    .innerJoin(
      organizations,
      eq(organizations.id, organizationBudgets.organizationId),
    )
    .orderBy(organizationBudgets.year, organizations.nome);

  const allOrganizations = await db
    .select({ id: organizations.id, nome: organizations.nome })
    .from(organizations)
    .orderBy(organizations.nome);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-alt)" }}>
      <div
        className="sticky top-14 z-10 border-b px-6 py-3.5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: "var(--fg-muted)" }}
        >
          Financeiro
        </p>
        <p
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--fg)" }}
        >
          Orçamento por instituição
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
          Teto anual de orçamento por instituição — usado por Projetos para
          bloquear a submissão de projetos que ultrapassem o limite.
        </p>
      </div>

      <div className="p-6">
        <OrganizationBudgetsManager
          budgets={budgets}
          organizations={allOrganizations}
        />
      </div>
    </div>
  );
}
