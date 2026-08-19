/**
 * projetos-approval.test.ts — onProjectApproved (P-3.11)
 *
 * Cobre o critério de aceite "Aprovação de projeto cria centro de custo e
 * payables reais" / "Payables de projeto nascem NÃO aprovados": o stub
 * anterior só criava o centro de custo — esta função agora também gera um
 * financeiro.payables por parcela em payment_schedules, ligado via
 * payment_schedule_id, em status "pendente".
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { users, roleAssignments } from "../schema/public";
import { organizations, projects, paymentSchedules } from "../schema/projetos";
import { costCenters, payables } from "../schema/financeiro";
import { auditLog } from "../schema/admin";
import { notifications } from "../schema/notifications";
import {
  generatePaymentSchedule,
  onProjectApproved,
  notifyProjectApprovalFailure,
} from "../projetos-approval";

const IDS = {
  submitter: "dbaa0000-0000-0000-0000-000000000001",
  admin: "dbaa0000-0000-0000-0000-000000000002",
  org: "dbbb0000-0000-0000-0000-000000000001",
  project: "dbcc0000-0000-0000-0000-000000000001",
};

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.submitter,
      email: "approval-sub@test.hebron",
      fullName: "Approval Submissor",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.submitter, role: "submissor" })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({
      id: IDS.admin,
      email: "approval-admin@test.hebron",
      fullName: "Approval Admin",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.admin, role: "super_admin" })
    .onConflictDoNothing();
  await db
    .insert(organizations)
    .values({
      id: IDS.org,
      nome: "Org Approval Test",
      createdBy: IDS.submitter,
    })
    .onConflictDoNothing();

  await db.insert(projects).values({
    id: IDS.project,
    title: "Projeto Approval Test",
    tipo: "anual",
    stage: "aprovado",
    submitterId: IDS.submitter,
    organizationId: IDS.org,
    parcelas: 3,
    meses: 3,
    budgetTotal: "9000.00",
    evaluationYear: new Date().getFullYear(),
  });

  await generatePaymentSchedule({
    id: IDS.project,
    parcelas: 3,
    budgetTotal: "9000.00",
    evaluationYear: new Date().getFullYear(),
    meses: 3,
  });
});

afterAll(async () => {
  const [costCenter] = await db
    .select({ id: costCenters.id })
    .from(costCenters)
    .where(eq(costCenters.projectId, IDS.project));
  if (costCenter) {
    const orphanPayables = await db
      .select({ id: payables.id })
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));
    for (const p of orphanPayables) {
      await db.delete(auditLog).where(eq(auditLog.entityId, p.id));
    }
    await db.delete(payables).where(eq(payables.costCenterId, costCenter.id));
  }
  await db
    .delete(paymentSchedules)
    .where(eq(paymentSchedules.projectId, IDS.project));
  await db.delete(costCenters).where(eq(costCenters.projectId, IDS.project));
  await db.delete(projects).where(eq(projects.id, IDS.project));
  await db.delete(organizations).where(eq(organizations.id, IDS.org));
  await db.delete(notifications).where(eq(notifications.userId, IDS.admin));
  await db.delete(auditLog).where(eq(auditLog.entityId, IDS.project));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.submitter));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, IDS.admin));
  await db.delete(users).where(eq(users.id, IDS.submitter));
  await db.delete(users).where(eq(users.id, IDS.admin));
});

describe("onProjectApproved", () => {
  it("cria centro de custo + um payable pendente por parcela, auditados", async () => {
    await onProjectApproved(IDS.project);

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.project));
    expect(costCenter).toBeTruthy();
    if (!costCenter) throw new Error("Centro de custo não criado");
    expect(costCenter.budgetTotal).toBe("9000.00");

    const schedules = await db
      .select()
      .from(paymentSchedules)
      .where(eq(paymentSchedules.projectId, IDS.project));
    expect(schedules.length).toBe(3);

    const createdPayables = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));
    expect(createdPayables.length).toBe(3);
    for (const p of createdPayables) {
      expect(p.status).toBe("pendente");
      expect(p.paymentScheduleId).toBeTruthy();
    }

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entity, "payable"));
    expect(
      audits.filter((a) => a.action === "financeiro.payable.created").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("é idempotente — segunda execução não duplica payables", async () => {
    await onProjectApproved(IDS.project);

    const [costCenter] = await db
      .select()
      .from(costCenters)
      .where(eq(costCenters.projectId, IDS.project));
    if (!costCenter) throw new Error("Centro de custo não encontrado");

    const createdPayables = await db
      .select()
      .from(payables)
      .where(eq(payables.costCenterId, costCenter.id));
    expect(createdPayables.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// notifyProjectApprovalFailure — PACOTE 2 (AUDIT/04-BACKLOG-CORRECAO.md,
// FLX-001). Cobre o critério "falha de onProjectApproved gera notificação
// para super_admin" e "deixa rastro observável, não só console.error": os
// dois call sites (apps/projetos/actions/projects.ts,
// packages/jobs/crons/projetos.ts) chamam esta função dentro do catch —
// aqui testamos a própria função, que é a peça exportada e reusada.
// ---------------------------------------------------------------------------
describe("notifyProjectApprovalFailure", () => {
  it("audita financeiro.integration.failed e notifica todo super_admin", async () => {
    await notifyProjectApprovalFailure(IDS.project, "erro simulado de teste");

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, IDS.project));
    const failureAudit = audits.find(
      (a) => a.action === "financeiro.integration.failed",
    );
    expect(failureAudit).toBeTruthy();
    expect(JSON.stringify(failureAudit?.diff)).toContain(
      "erro simulado de teste",
    );

    const notified = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, IDS.admin));
    expect(
      notified.some((n) => n.type === "financeiro.integration.failed"),
    ).toBe(true);
  });
});
