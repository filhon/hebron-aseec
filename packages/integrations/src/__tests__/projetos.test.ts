/**
 * projetos.test.ts — getOrganizationBudgetStatus (P-2.3c)
 *
 * Leitura de exibição irmã de checkOrganizationBudget: mesma fonte
 * (financeiro.organization_budgets para o teto) e mesma consulta de
 * comprometido (projects, deleted_at IS NULL, excluindo reprovado — inclui
 * rascunho) usadas para bloquear a submissão. Garante que o card do
 * dashboard do submissor nunca mostre um teto diferente do que de fato
 * governa a submissão (BRAIN §6.2).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  organizations,
  projects,
  organizationBudgets,
} from "@hebron/db/schema";
import { getOrganizationBudgetStatus } from "../projetos";

const IDS = {
  submitter: "ebdd0000-0000-0000-0000-000000000001",
  orgComTeto: "ebdd0000-0000-0000-0000-0000000000b1",
  orgSemTeto: "ebdd0000-0000-0000-0000-0000000000b2",
  orgAcimaTeto: "ebdd0000-0000-0000-0000-0000000000b3",
  orgFiltros: "ebdd0000-0000-0000-0000-0000000000b4",
  projComTeto: "ebdd0000-0000-0000-0000-0000000000c1",
  projSemTeto: "ebdd0000-0000-0000-0000-0000000000c2",
  projAcimaTeto: "ebdd0000-0000-0000-0000-0000000000c3",
  projFiltroAprovado: "ebdd0000-0000-0000-0000-0000000000c4",
  projFiltroRascunho: "ebdd0000-0000-0000-0000-0000000000c5",
  projFiltroReprovado: "ebdd0000-0000-0000-0000-0000000000c6",
};

const YEAR = 2033; // ano isolado, não colide com outros testes de orçamento

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.submitter,
      email: "integ-budget-status@test.hebron",
      fullName: "Integ Budget Status",
    })
    .onConflictDoNothing();

  await db
    .insert(organizations)
    .values([
      { id: IDS.orgComTeto, nome: "Org Com Teto", createdBy: IDS.submitter },
      { id: IDS.orgSemTeto, nome: "Org Sem Teto", createdBy: IDS.submitter },
      {
        id: IDS.orgAcimaTeto,
        nome: "Org Acima Teto",
        createdBy: IDS.submitter,
      },
      { id: IDS.orgFiltros, nome: "Org Filtros", createdBy: IDS.submitter },
    ])
    .onConflictDoNothing();

  await db.insert(organizationBudgets).values([
    {
      organizationId: IDS.orgComTeto,
      year: YEAR,
      amount: "10000.00",
      createdBy: IDS.submitter,
    },
    {
      organizationId: IDS.orgAcimaTeto,
      year: YEAR,
      amount: "5000.00",
      createdBy: IDS.submitter,
    },
  ]);

  await db.insert(projects).values([
    {
      id: IDS.projComTeto,
      title: "Projeto com teto",
      tipo: "anual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.orgComTeto,
      budgetTotal: "7000.00",
      evaluationYear: YEAR,
    },
    {
      id: IDS.projSemTeto,
      title: "Projeto sem teto",
      tipo: "anual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.orgSemTeto,
      budgetTotal: "5000.00",
      evaluationYear: YEAR,
    },
    {
      id: IDS.projAcimaTeto,
      title: "Projeto acima do teto",
      tipo: "anual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.orgAcimaTeto,
      budgetTotal: "9000.00",
      evaluationYear: YEAR,
    },
    {
      id: IDS.projFiltroAprovado,
      title: "Filtro — aprovado",
      tipo: "pontual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.orgFiltros,
      budgetTotal: "1000.00",
      evaluationYear: YEAR,
    },
    {
      id: IDS.projFiltroRascunho,
      title: "Filtro — rascunho",
      tipo: "pontual",
      stage: "rascunho",
      submitterId: IDS.submitter,
      organizationId: IDS.orgFiltros,
      budgetTotal: "2000.00",
      evaluationYear: YEAR,
    },
    {
      id: IDS.projFiltroReprovado,
      title: "Filtro — reprovado",
      tipo: "pontual",
      stage: "reprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.orgFiltros,
      budgetTotal: "999999.00",
      evaluationYear: YEAR,
    },
  ]);
});

afterAll(async () => {
  await db.delete(projects).where(eq(projects.submitterId, IDS.submitter));
  await db
    .delete(organizationBudgets)
    .where(eq(organizationBudgets.organizationId, IDS.orgComTeto));
  await db
    .delete(organizationBudgets)
    .where(eq(organizationBudgets.organizationId, IDS.orgAcimaTeto));
  await db.delete(organizations).where(eq(organizations.id, IDS.orgComTeto));
  await db.delete(organizations).where(eq(organizations.id, IDS.orgSemTeto));
  await db.delete(organizations).where(eq(organizations.id, IDS.orgAcimaTeto));
  await db.delete(organizations).where(eq(organizations.id, IDS.orgFiltros));
  await db.delete(users).where(eq(users.id, IDS.submitter));
});

describe("getOrganizationBudgetStatus", () => {
  it("com teto: retorna o limite configurado e o comprometido abaixo dele", async () => {
    const status = await getOrganizationBudgetStatus(IDS.orgComTeto, YEAR);
    expect(status.limit).toBe(10000);
    expect(status.committed).toBe(7000);
  });

  it("sem teto: limit é null (BRAIN §6.2 — instituição sem orçamento configurado não tem teto)", async () => {
    const status = await getOrganizationBudgetStatus(IDS.orgSemTeto, YEAR);
    expect(status.limit).toBeNull();
    expect(status.committed).toBe(5000);
  });

  it("comprometido acima do teto: retorna os valores brutos, sem clamping — a UI decide como exibir", async () => {
    const status = await getOrganizationBudgetStatus(IDS.orgAcimaTeto, YEAR);
    expect(status.limit).toBe(5000);
    expect(status.committed).toBe(9000);
  });

  it("comprometido soma o mesmo conjunto que checkOrganizationBudget (inclui rascunho, exclui reprovado)", async () => {
    const status = await getOrganizationBudgetStatus(IDS.orgFiltros, YEAR);
    expect(status.committed).toBe(3000); // 1000 (aprovado) + 2000 (rascunho); reprovado (999999) excluído
  });
});
