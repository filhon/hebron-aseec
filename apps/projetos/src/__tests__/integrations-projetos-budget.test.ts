/**
 * integrations-projetos-budget.test.ts — checkOrganizationBudget (P-3.11)
 *
 * A função foi movida de apps/projetos/src/actions/projects.ts para
 * packages/integrations/src/projetos.ts (P-0.15 — nada de lógica cross-app
 * dentro do app). Este teste confirma que a versão do package continua
 * lendo financeiro.organization_budgets e bloqueando corretamente quando o
 * total (existente + novo) excede o teto configurado.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  projects,
  organizationBudgets,
} from "@hebron/db/schema";
import { checkOrganizationBudget } from "@hebron/integrations/projetos";

const IDS = {
  submitter: "ebaa0000-0000-0000-0000-000000000001",
  org: "ebbb0000-0000-0000-0000-000000000001",
  existingProject: "ebcc0000-0000-0000-0000-000000000001",
};

const YEAR = 2031; // ano isolado para não colidir com outros testes
const BUDGET_LIMIT = 10000;

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.submitter,
      email: "integ-budget-sub@test.hebron",
      fullName: "Integ Budget Submissor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.submitter, role: "submissor" })
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({ id: IDS.org, nome: "Org Integ Budget", createdBy: IDS.submitter })
    .onConflictDoNothing();
  await db.insert(organizationBudgets).values({
    organizationId: IDS.org,
    year: YEAR,
    amount: BUDGET_LIMIT.toString(),
    createdBy: IDS.submitter,
  });
  await db.insert(projects).values({
    id: IDS.existingProject,
    title: "Projeto existente",
    tipo: "anual",
    stage: "aprovado",
    submitterId: IDS.submitter,
    organizationId: IDS.org,
    budgetTotal: "7000.00",
    evaluationYear: YEAR,
  });
});

afterAll(async () => {
  await db.delete(projects).where(eq(projects.id, IDS.existingProject));
  await db
    .delete(organizationBudgets)
    .where(eq(organizationBudgets.organizationId, IDS.org));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.submitter));
});

describe("checkOrganizationBudget (via @hebron/integrations/projetos)", () => {
  it("passa quando o total (existente + novo) fica dentro do teto", async () => {
    await expect(
      checkOrganizationBudget(IDS.org, YEAR, 2000),
    ).resolves.toBeUndefined();
  });

  it("bloqueia quando o total excede o teto", async () => {
    await expect(checkOrganizationBudget(IDS.org, YEAR, 4000)).rejects.toThrow(
      /Orçamento da instituição excedido/,
    );
  });

  it("passa sem teto quando não há orçamento configurado (fail-open)", async () => {
    await expect(
      checkOrganizationBudget(IDS.org, YEAR + 1, 999999),
    ).resolves.toBeUndefined();
  });
});
