/**
 * projetos-inadimplencia.test.ts — runProjetosInadimplenciaCheck (P-3.11)
 *
 * "Bloqueio por inadimplência de relatório" (BRAIN §6.2): payable "pendente"
 * de um projeto com relatório vencido (dueDate passada, status "pendente")
 * entra em status "bloqueado", auditado. Payables já aprovados/autorizados
 * e projetos sem relatório vencido não são tocados.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  organizations,
  projects,
  reports,
  costCenters,
  payables,
  auditLog,
} from "@hebron/db/schema";
import { runProjetosInadimplenciaCheck } from "../crons/projetos-inadimplencia";

const IDS = {
  submitter: "edaa0000-0000-0000-0000-000000000001",
  org: "edaa0000-0000-0000-0000-000000000002",
  overdueProject: "edaa0000-0000-0000-0000-000000000003",
  upToDateProject: "edaa0000-0000-0000-0000-000000000004",
  approvedPayableProject: "edaa0000-0000-0000-0000-000000000005",
};

function dateOnlyUTC(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  const iso = d.toISOString().split("T")[0];
  if (!iso) throw new Error("Invalid date");
  return iso;
}

async function makeCostCenter(projectId: string) {
  const [cc] = await db
    .insert(costCenters)
    .values({
      projectId,
      code: `TEST-INAD-${projectId.slice(-8)}`,
      name: "Centro de custo teste inadimplência",
      budgetTotal: "5000.00",
      status: "ativo",
    })
    .returning();
  if (!cc) throw new Error("Fixture: falha ao criar centro de custo");
  return cc;
}

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.submitter,
      email: "inad-sub@test.hebron",
      fullName: "Inadimplência Submissor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.submitter, role: "submissor" })
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Inadimplência",
      createdBy: IDS.submitter,
    })
    .onConflictDoNothing();

  await db.insert(projects).values([
    {
      id: IDS.overdueProject,
      title: "Projeto com relatório vencido",
      tipo: "anual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
      budgetTotal: "5000.00",
      evaluationYear: new Date().getFullYear(),
    },
    {
      id: IDS.upToDateProject,
      title: "Projeto em dia",
      tipo: "anual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
      budgetTotal: "5000.00",
      evaluationYear: new Date().getFullYear(),
    },
    {
      id: IDS.approvedPayableProject,
      title: "Projeto vencido com payable já aprovado",
      tipo: "anual",
      stage: "aprovado",
      submitterId: IDS.submitter,
      organizationId: IDS.org,
      budgetTotal: "5000.00",
      evaluationYear: new Date().getFullYear(),
    },
  ]);

  await db.insert(reports).values([
    {
      projectId: IDS.overdueProject,
      status: "pendente",
      dueDate: dateOnlyUTC(-5),
    },
    {
      projectId: IDS.upToDateProject,
      status: "pendente",
      dueDate: dateOnlyUTC(5),
    },
    {
      projectId: IDS.approvedPayableProject,
      status: "pendente",
      dueDate: dateOnlyUTC(-5),
    },
  ]);

  const ccOverdue = await makeCostCenter(IDS.overdueProject);
  const ccUpToDate = await makeCostCenter(IDS.upToDateProject);
  const ccApproved = await makeCostCenter(IDS.approvedPayableProject);

  await db.insert(payables).values([
    {
      description: "Payable pendente — deve bloquear",
      amount: "1000.00",
      dueDate: dateOnlyUTC(10),
      costCenterId: ccOverdue.id,
      status: "pendente",
      createdBy: IDS.submitter,
    },
    {
      description: "Payable de projeto em dia — não deve bloquear",
      amount: "1000.00",
      dueDate: dateOnlyUTC(10),
      costCenterId: ccUpToDate.id,
      status: "pendente",
      createdBy: IDS.submitter,
    },
    {
      description: "Payable já aprovado — não deve ser tocado",
      amount: "1000.00",
      dueDate: dateOnlyUTC(10),
      costCenterId: ccApproved.id,
      status: "aprovado",
      approvedBy: IDS.submitter,
      approvedAt: new Date(),
      createdBy: IDS.submitter,
    },
  ]);
});

afterAll(async () => {
  for (const projectId of [
    IDS.overdueProject,
    IDS.upToDateProject,
    IDS.approvedPayableProject,
  ]) {
    const [cc] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, projectId));
    if (cc) {
      const rows = await db
        .select({ id: payables.id })
        .from(payables)
        .where(eq(payables.costCenterId, cc.id));
      for (const p of rows) {
        await db.delete(auditLog).where(eq(auditLog.entityId, p.id));
      }
      await db.delete(payables).where(eq(payables.costCenterId, cc.id));
    }
    await db.delete(costCenters).where(eq(costCenters.projectId, projectId));
    await db.delete(reports).where(eq(reports.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
  }
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.submitter));
});

describe("runProjetosInadimplenciaCheck", () => {
  it("bloqueia payables pendentes de projetos com relatório vencido, audita, e ignora o resto", async () => {
    const { blockedPayableIds } = await runProjetosInadimplenciaCheck();
    expect(blockedPayableIds.length).toBeGreaterThanOrEqual(1);

    const [ccOverdue] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.overdueProject));
    if (!ccOverdue) throw new Error("Fixture ausente");
    const [blocked] = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, ccOverdue.id));
    expect(blocked?.status).toBe("bloqueado");
    expect(blocked?.blockReason).toBe("relatorio_vencido");
    expect(blocked?.blockedAt).toBeTruthy();

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, blocked?.id ?? ""));
    expect(audits.some((a) => a.action === "financeiro.payable.blocked")).toBe(
      true,
    );

    const [ccUpToDate] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.upToDateProject));
    if (!ccUpToDate) throw new Error("Fixture ausente");
    const [notBlocked] = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, ccUpToDate.id));
    expect(notBlocked?.status).toBe("pendente");

    const [ccApproved] = await db
      .select({ id: costCenters.id })
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.approvedPayableProject));
    if (!ccApproved) throw new Error("Fixture ausente");
    const [untouched] = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, ccApproved.id));
    expect(untouched?.status).toBe("aprovado");
  });

  it("é idempotente — segunda execução não re-bloqueia (já não está mais pendente)", async () => {
    const { blockedPayableIds } = await runProjetosInadimplenciaCheck();
    expect(blockedPayableIds.length).toBe(0);
  });
});
