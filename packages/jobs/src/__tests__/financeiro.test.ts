/**
 * financeiro.test.ts — runWeeklyBatchCreation (cron) e o override de
 * templates de email do Financeiro (P-3.10b, corretivo de S-70).
 *
 * createWeeklyBatch (apps/financeiro/src/actions/approval.ts) tem cobertura
 * própria em apps/financeiro/src/__tests__/governance.test.ts. Este arquivo
 * cobre o segundo chamador da MESMA regra (BRAIN §6.5): o cron aqui usa
 * exatamente as mesmas funções de @hebron/integrations/financeiro
 * (getWeeklyBatchWindow/selectWeeklyBatchPendingPayables/
 * resolveWeeklyBatchRecipients) que a action — não uma cópia própria.
 *
 * Diferente da action (que aceita `weekOffset` e pode mirar uma semana no
 * passado, isolada de ruído), o cron sempre roda para a semana corrente
 * (`getWeeklyBatchWindow(new Date())`, sem offset — é assim que o Inngest o
 * agenda). Por isso as asserções aqui são por inclusão/exclusão de payable
 * (nunca por contagem exata), tolerando outras contas pendentes reais que já
 * existam na semana corrente do banco de dev compartilhado.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  payables,
  batchApprovals,
  batchApprovalItems,
  emailTemplates,
} from "@hebron/db/schema";

const createNotificationMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("@hebron/email", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

import { getWeeklyBatchWindow } from "@hebron/integrations/financeiro";
import {
  runWeeklyBatchCreation,
  runMonthlyReport,
  createWeeklyBatch,
  notifyWeeklyBatchRecipients,
} from "../crons/financeiro";

const IDS = {
  gestor: "cd150000-0000-0000-0000-000000000001",
  conselheiro: "cd150000-0000-0000-0000-000000000002",
} as const;

const { weekStart } = getWeeklyBatchWindow(new Date());

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.gestor,
        email: "jobs-fin-gestor@test.hebron",
        fullName: "Jobs Financeiro Gestor",
      },
      {
        id: IDS.conselheiro,
        email: "jobs-fin-conselheiro@test.hebron",
        fullName: "Jobs Financeiro Conselheiro",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.gestor, role: "diretor", grantedBy: IDS.gestor },
      { userId: IDS.conselheiro, role: "conselheiro", grantedBy: IDS.gestor },
    ])
    .onConflictDoNothing();

  await db
    .insert(designations)
    .values({ type: "gestor", userId: IDS.gestor, assignedBy: IDS.gestor })
    .onConflictDoNothing();

  // runWeeklyBatchCreation sempre opera sobre a semana corrente (sem
  // weekOffset) — um lote real já existente para esta semana no banco de
  // dev compartilhado faria o cron retornar cedo (idempotente) e nenhum dos
  // dois testes abaixo veria os payables/templates de teste. Removido aqui
  // uma única vez, antes de qualquer describe.
  const currentWeekBatches = await db
    .select({ id: batchApprovals.id })
    .from(batchApprovals)
    .where(eq(batchApprovals.weekStart, weekStart));
  for (const b of currentWeekBatches) {
    await db.delete(batchApprovals).where(eq(batchApprovals.id, b.id));
  }
});

afterAll(async () => {
  await db.delete(designations).where(eq(designations.userId, IDS.gestor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.gestor));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.conselheiro));

  // Rede de segurança: qualquer payable órfão de uma execução anterior deste
  // arquivo (criado por IDS.gestor/IDS.conselheiro) tem que sumir antes dos
  // usuários — payables_created_by_fkey é RESTRICT. Batches que ainda
  // referenciem esses payables também precisam sumir primeiro (cascade nos
  // itens, mas payableId em batch_approval_items é RESTRICT).
  const testUserIds = [IDS.gestor, IDS.conselheiro];
  const orphanPayables = await db
    .select({ id: payables.id })
    .from(payables)
    .where(inArray(payables.createdBy, testUserIds));
  if (orphanPayables.length > 0) {
    const orphanPayableIds = orphanPayables.map((p) => p.id);
    const orphanItems = await db
      .select({ batchApprovalId: batchApprovalItems.batchApprovalId })
      .from(batchApprovalItems)
      .where(inArray(batchApprovalItems.payableId, orphanPayableIds));
    const orphanBatchIds = [
      ...new Set(orphanItems.map((i) => i.batchApprovalId)),
    ];
    for (const batchId of orphanBatchIds) {
      await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    }
    await db.delete(payables).where(inArray(payables.id, orphanPayableIds));
  }

  await db.delete(users).where(eq(users.id, IDS.gestor));
  await db.delete(users).where(eq(users.id, IDS.conselheiro));
});

describe("runWeeklyBatchCreation — payable bloqueado não entra no lote (paridade com a action, P-3.10b)", () => {
  const pendingId = "cd160000-0000-0000-0000-000000000001";
  const blockedId = "cd160000-0000-0000-0000-000000000002";
  let createdBatchId: string | null = null;

  beforeAll(async () => {
    await db.insert(payables).values([
      {
        id: pendingId,
        description: "Payable pendente — deve entrar no lote (cron)",
        amount: "120.00",
        dueDate: weekStart,
        status: "pendente",
        createdBy: IDS.gestor,
      },
      {
        id: blockedId,
        description: "Payable bloqueado — não deve entrar no lote (cron)",
        amount: "220.00",
        dueDate: weekStart,
        status: "bloqueado",
        blockedAt: new Date(),
        blockReason: "relatorio_vencido",
        createdBy: IDS.gestor,
      },
    ]);
  });

  afterAll(async () => {
    // batchApprovalItems.batchApprovalId é ON DELETE CASCADE — apagar o lote
    // já remove os itens; payableId é ON DELETE RESTRICT, por isso o lote
    // precisa sumir antes dos payables.
    if (createdBatchId) {
      await db
        .delete(batchApprovals)
        .where(eq(batchApprovals.id, createdBatchId));
    }
    await db.delete(payables).where(eq(payables.id, pendingId));
    await db.delete(payables).where(eq(payables.id, blockedId));
  });

  it("payable pendente entra no lote da semana corrente; o bloqueado fica de fora", async () => {
    createNotificationMock.mockClear();
    const result = await runWeeklyBatchCreation();
    createdBatchId = result.batchId;
    expect(result.batchId).toBeTruthy();

    const items = await db
      .select({ payableId: batchApprovalItems.payableId })
      .from(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, result.batchId as string));
    const itemPayableIds = items.map((i) => i.payableId);

    expect(itemPayableIds).toContain(pendingId);
    expect(itemPayableIds).not.toContain(blockedId);
  });
});

describe("Templates de email do Financeiro — override do Admin no cron (P-3.10b)", () => {
  const payableId = "cd160000-0000-0000-0000-000000000003";
  let createdBatchId: string | null = null;

  beforeAll(async () => {
    await db.insert(payables).values({
      id: payableId,
      description: "Payable — teste override de template de lote (cron)",
      amount: "40.00",
      dueDate: weekStart,
      status: "pendente",
      createdBy: IDS.gestor,
    });
    await db
      .insert(emailTemplates)
      .values({
        slug: "financeiro-batch-approval",
        subject: "TESTE OVERRIDE LOTE (CRON) — {{quantidade}} conta(s)",
        bodyHtml: "<p>override cron {{semanaInicio}} {{semanaFim}}</p>",
        bodyText: "override",
        variables: ["quantidade", "semanaInicio", "semanaFim"],
        updatedBy: IDS.gestor,
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: "TESTE OVERRIDE LOTE (CRON) — {{quantidade}} conta(s)",
          bodyHtml: "<p>override cron {{semanaInicio}} {{semanaFim}}</p>",
        },
      });
    await db
      .insert(emailTemplates)
      .values({
        slug: "financeiro-monthly-report",
        subject: "TESTE OVERRIDE RELATÓRIO — {{mes}}/{{ano}}",
        bodyHtml: "<p>override {{receitas}} {{despesas}} {{resultado}}</p>",
        bodyText: "override",
        variables: ["mes", "ano", "receitas", "despesas", "resultado"],
        updatedBy: IDS.gestor,
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: "TESTE OVERRIDE RELATÓRIO — {{mes}}/{{ano}}",
          bodyHtml: "<p>override {{receitas}} {{despesas}} {{resultado}}</p>",
        },
      });
  });

  afterAll(async () => {
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.slug, "financeiro-batch-approval"));
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.slug, "financeiro-monthly-report"));
    if (createdBatchId) {
      await db
        .delete(batchApprovals)
        .where(eq(batchApprovals.id, createdBatchId));
    }
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("runWeeklyBatchCreation usa o texto salvo em admin.email_templates para o email de lote", async () => {
    createNotificationMock.mockClear();
    const result = await runWeeklyBatchCreation();
    createdBatchId = result.batchId;
    expect(result.batchId).toBeTruthy();

    const emailCall = createNotificationMock.mock.calls.find(
      (call) =>
        (call[0] as { data: { userId: string; channel: string } }).data
          .userId === IDS.gestor &&
        (call[0] as { data: { channel: string } }).data.channel === "email",
    );
    expect(emailCall).toBeDefined();
    const email = (
      emailCall?.[0] as { email: { subject: string; html: string } }
    ).email;
    expect(email.subject).toMatch(
      /^TESTE OVERRIDE LOTE \(CRON\) — \d+ conta\(s\)$/,
    );
    expect(email.html).toContain(weekStart);
  });

  it("runMonthlyReport usa o texto salvo em admin.email_templates para o relatório mensal", async () => {
    createNotificationMock.mockClear();
    await runMonthlyReport();

    const emailCall = createNotificationMock.mock.calls.find(
      (call) =>
        (call[0] as { data: { userId: string; channel: string } }).data
          .userId === IDS.conselheiro &&
        (call[0] as { data: { channel: string } }).data.channel === "email",
    );
    expect(emailCall).toBeDefined();
    const email = (emailCall?.[0] as { email: { subject: string } }).email;
    expect(email.subject).toMatch(/^TESTE OVERRIDE RELATÓRIO — /);
  });
});

describe("notifyWeeklyBatchRecipients — falha no meio do envio não bloqueia o reenvio no retry (D5-001)", () => {
  const gestorIds = [
    "cd170000-0000-0000-0000-000000000001",
    "cd170000-0000-0000-0000-000000000002",
    "cd170000-0000-0000-0000-000000000003",
  ] as const;
  const payableId = "cd170000-0000-0000-0000-000000000004";
  let createdBatchId: string | null = null;

  beforeAll(async () => {
    await db
      .insert(users)
      .values(
        gestorIds.map((id, i) => ({
          id,
          email: `jobs-fin-retry-${i}@test.hebron`,
          fullName: `Jobs Financeiro Retry ${i}`,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(roleAssignments)
      .values(
        gestorIds.map((id) => ({
          userId: id,
          role: "diretor" as const,
          grantedBy: id,
        })),
      )
      .onConflictDoNothing();

    // 3 gestores designados — garante pelo menos 3 destinatários "to" no
    // envio, independente de outras designações reais já existentes no
    // banco de dev compartilhado.
    await db
      .insert(designations)
      .values(
        gestorIds.map((id) => ({
          type: "gestor" as const,
          userId: id,
          assignedBy: id,
        })),
      )
      .onConflictDoNothing();

    await db.insert(payables).values({
      id: payableId,
      description: "Payable — teste retry de notificação do lote (cron)",
      amount: "77.00",
      dueDate: weekStart,
      status: "pendente",
      createdBy: gestorIds[0],
    });
  });

  afterAll(async () => {
    if (createdBatchId) {
      await db
        .delete(batchApprovals)
        .where(eq(batchApprovals.id, createdBatchId));
    }
    await db.delete(payables).where(eq(payables.id, payableId));
    await db
      .delete(designations)
      .where(inArray(designations.userId, [...gestorIds]));
    await db
      .delete(roleAssignments)
      .where(inArray(roleAssignments.userId, [...gestorIds]));
    await db.delete(users).where(inArray(users.id, [...gestorIds]));
  });

  it("falha simulada no 2º destinatário não marca notified_at; retry reenvia a todos e completa", async () => {
    const created = await createWeeklyBatch();
    createdBatchId = created.batchId;
    expect(created.batchId).toBeTruthy();
    const batchId = created.batchId as string;

    createNotificationMock.mockClear();
    let callCount = 0;
    createNotificationMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 2) {
        throw new Error("Falha simulada — destinatário 2 indisponível");
      }
      return { id: "mock-id" };
    });

    await expect(notifyWeeklyBatchRecipients(batchId)).rejects.toThrow(
      "Falha simulada — destinatário 2 indisponível",
    );

    const afterFailure = await db
      .select({ notifiedAt: batchApprovals.notifiedAt })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId))
      .limit(1);
    expect(afterFailure[0]?.notifiedAt).toBeNull();

    // Retry (equivalente ao Inngest reexecutando o step "notify-recipients")
    // — a guarda antiga ("existe lote?") teria pulado o laço inteiro aqui.
    createNotificationMock.mockClear();
    createNotificationMock.mockImplementation(async () => ({ id: "mock-id" }));

    await notifyWeeklyBatchRecipients(batchId);

    const notifiedUserIds = createNotificationMock.mock.calls
      .filter(
        (call) =>
          (call[0] as { data: { channel: string } }).data.channel === "email",
      )
      .map((call) => (call[0] as { data: { userId: string } }).data.userId);
    for (const id of gestorIds) {
      expect(notifiedUserIds).toContain(id);
    }

    const afterRetry = await db
      .select({ notifiedAt: batchApprovals.notifiedAt })
      .from(batchApprovals)
      .where(eq(batchApprovals.id, batchId))
      .limit(1);
    expect(afterRetry[0]?.notifiedAt).not.toBeNull();
  });
});
