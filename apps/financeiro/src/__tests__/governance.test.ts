/**
 * governance.test.ts — fluxo completo de governança dual e inadimplência (P-3.12).
 *
 * approveBatch/authorizeBatch (designation gestor/autorizador) já têm
 * cobertura própria em designation-governance.test.ts — este arquivo cobre o
 * que falta: o fluxo INTEIRO até "pago" (markPayableAsPaid) e a garantia de
 * que createWeeklyBatch nunca inclui um payable "bloqueado" por
 * inadimplência de relatório (P-3.11, BRAIN §6.2) — o override auditado já
 * tem cobertura própria em payables-override-block.test.ts. Também cobre
 * (P-3.9c) a garantia de que cancelPayable/cancelReceivable permanecem
 * visíveis ao staff via RLS autenticada após o cancelamento — o bug que
 * S-215 corrigiu para payables (deleted_at nunca é setado no cancelamento).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  designations,
  bankAccounts,
  payables,
  receivables,
  transactions,
  batchApprovals,
  batchApprovalItems,
  auditLog,
  costCenters,
  budgets,
  emailTemplates,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(),
}));

// createWeeklyBatch envia notificação por email ao(s) gestor(es) — mockado
// para não depender de RESEND_API_KEY nem de destinatários reais no banco.
const createNotificationMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("@hebron/email", () => ({
  createNotification: (...args: unknown[]) => createNotificationMock(...args),
}));

const IDS = {
  gestor: "cc110000-0000-0000-0000-000000000001",
  autorizador: "cc110000-0000-0000-0000-000000000002",
  superAdmin: "cc110000-0000-0000-0000-000000000003",
} as const;

const ACCOUNT_ID = "cc110000-0000-0000-0000-000000000010";

async function actingAs(
  userId: string,
  roles: string[],
  userDesignations: string[],
) {
  const { resolveSession } = await import("@hebron/auth/server");
  vi.mocked(resolveSession).mockResolvedValueOnce({
    actorId: userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: roles as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    designations: userDesignations as any,
  });
}

function getISOWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (dt: Date) => dt.toISOString().split("T")[0] ?? "";
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.gestor,
        email: "gov2-gestor@test.hebron",
        fullName: "Gov2 Gestor",
      },
      {
        id: IDS.autorizador,
        email: "gov2-autorizador@test.hebron",
        fullName: "Gov2 Autorizador",
      },
      {
        id: IDS.superAdmin,
        email: "gov2-super-admin@test.hebron",
        fullName: "Gov2 SuperAdmin",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.gestor, role: "diretor", grantedBy: IDS.gestor },
      { userId: IDS.autorizador, role: "diretor", grantedBy: IDS.gestor },
      { userId: IDS.superAdmin, role: "super_admin", grantedBy: IDS.gestor },
    ])
    .onConflictDoNothing();

  await db
    .insert(designations)
    .values([
      { type: "gestor", userId: IDS.gestor, assignedBy: IDS.gestor },
      {
        type: "autorizador",
        userId: IDS.autorizador,
        assignedBy: IDS.gestor,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(bankAccounts)
    .values({
      id: ACCOUNT_ID,
      bankName: "Banco Governança Teste",
      nickname: "Conta Governança Teste",
      createdBy: IDS.superAdmin,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  for (const uid of Object.values(IDS)) {
    await db.delete(designations).where(eq(designations.userId, uid));
    await db.delete(designations).where(eq(designations.assignedBy, uid));
    await db.delete(auditLog).where(eq(auditLog.actorId, uid));
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, uid));
  }
  // ACCOUNT_ID e o usuário IDS.superAdmin permanecem: a transação de
  // pagamento criada por markPayableAsPaid os referencia via
  // account_id/created_by (FK RESTRICT) e é imutável — não pode ser
  // apagada, então quem ela referencia também não pode. gestor/autorizador
  // nunca aparecem como created_by de uma transação, então são removidos
  // normalmente. onConflictDoNothing no beforeAll reaproveita a mesma
  // conta/usuário na próxima execução.
  await db.delete(users).where(eq(users.id, IDS.gestor));
  await db.delete(users).where(eq(users.id, IDS.autorizador));
});

describe("Governança — fluxo completo aprovação → autorização → pago", () => {
  const batchId = "cc130000-0000-0000-0000-000000000001";
  // markPayableAsPaid cria uma transação real (imutável, nunca apagada) com
  // reference_id = payableId — um id fixo faria essa transação acumular a
  // cada execução (referenceId repetido), quebrando a asserção "exatamente
  // 1 transação" na 2ª rodada em diante. Id gerado pelo banco evita a
  // colisão; o próprio payable é apagado normalmente no afterAll (sem
  // trigger de imutabilidade).
  let payableId = "";

  beforeAll(async () => {
    const inserted = await db
      .insert(payables)
      .values({
        description: "Governança completa — teste fim a fim",
        amount: "300.00",
        dueDate: "2099-09-01",
        status: "pendente",
        createdBy: IDS.gestor,
      })
      .returning({ id: payables.id });
    const payable = inserted[0];
    if (!payable) throw new Error("Falha ao seedar payable de teste");
    payableId = payable.id;

    await db
      .insert(batchApprovals)
      .values({
        id: batchId,
        weekStart: "2099-09-01",
        weekEnd: "2099-09-07",
      })
      .onConflictDoNothing();
    await db.insert(batchApprovalItems).values({
      batchApprovalId: batchId,
      payableId,
    });
  });

  afterAll(async () => {
    // A transação de pagamento criada por markPayableAsPaid é imutável
    // (trigger financeiro.forbid_transaction_mutation) — nunca é apagada
    // (ver comentário no afterAll externo sobre ACCOUNT_ID/superAdmin).
    await db
      .delete(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, batchId));
    await db.delete(batchApprovals).where(eq(batchApprovals.id, batchId));
    await db.delete(payables).where(eq(payables.id, payableId));
  });

  it("aprova (gestor) → autoriza (autorizador) → paga (super_admin)", async () => {
    await actingAs(IDS.gestor, ["diretor"], ["gestor"]);
    const { approveBatch, authorizeBatch, markPayableAsPaid } =
      await import("../actions/approval");

    const approveResult = await approveBatch({ batchId });
    expect(approveResult?.serverError).toBeUndefined();

    let [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, payableId));
    expect(payable?.status).toBe("aprovado");

    await actingAs(IDS.autorizador, ["diretor"], ["autorizador"]);
    const authorizeResult = await authorizeBatch({ batchId });
    expect(authorizeResult?.serverError).toBeUndefined();

    [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, payableId));
    expect(payable?.status).toBe("autorizado");

    await actingAs(IDS.superAdmin, ["super_admin"], []);
    const paidResult = await markPayableAsPaid({
      payableId,
      bankAccountId: ACCOUNT_ID,
    });
    expect(paidResult?.serverError).toBeUndefined();

    [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, payableId));
    expect(payable?.status).toBe("pago");
    expect(payable?.paidBy).toBe(IDS.superAdmin);

    const ledgerTxs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.referenceId, payableId));
    expect(ledgerTxs).toHaveLength(1);
    expect(ledgerTxs[0]?.type).toBe("debito");
    expect(ledgerTxs[0]?.amount).toBe("300.00");

    const batchAudits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, batchId));
    const batchActions = batchAudits.map((a) => a.action);
    expect(batchActions).toEqual(
      expect.arrayContaining([
        "financeiro.batch.approved",
        "financeiro.batch.authorized",
      ]),
    );

    const payableAudits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, payableId));
    expect(
      payableAudits.some((a) => a.action === "financeiro.payable.paid"),
    ).toBe(true);
  });
});

describe("createWeeklyBatch — payable bloqueado não entra no lote (P-3.11)", () => {
  const pendingId = "cc140000-0000-0000-0000-000000000001";
  const blockedId = "cc140000-0000-0000-0000-000000000002";
  const WEEK_OFFSET = -3;
  let createdBatchId: string | null = null;
  let weekStart = "";
  let weekEnd = "";

  beforeAll(async () => {
    const referenceDate = new Date();
    referenceDate.setDate(referenceDate.getDate() + WEEK_OFFSET * 7);
    ({ weekStart, weekEnd } = getISOWeekBounds(referenceDate));

    // Limpa qualquer lote pré-existente para esta semana (evita colidir com
    // o UNIQUE (week_start, week_end) de uma execução anterior).
    const existing = await db
      .select({ id: batchApprovals.id })
      .from(batchApprovals)
      .where(eq(batchApprovals.weekStart, weekStart));
    for (const b of existing) {
      await db
        .delete(batchApprovalItems)
        .where(eq(batchApprovalItems.batchApprovalId, b.id));
      await db.delete(batchApprovals).where(eq(batchApprovals.id, b.id));
    }

    await db.insert(payables).values([
      {
        id: pendingId,
        description: "Payable pendente — deve entrar no lote",
        amount: "100.00",
        dueDate: weekStart,
        status: "pendente",
        createdBy: IDS.superAdmin,
      },
      {
        id: blockedId,
        description: "Payable bloqueado — não deve entrar no lote",
        amount: "200.00",
        dueDate: weekStart,
        status: "bloqueado",
        blockedAt: new Date(),
        blockReason: "relatorio_vencido",
        createdBy: IDS.superAdmin,
      },
    ]);
  });

  afterAll(async () => {
    if (createdBatchId) {
      await db
        .delete(batchApprovalItems)
        .where(eq(batchApprovalItems.batchApprovalId, createdBatchId));
      await db
        .delete(batchApprovals)
        .where(eq(batchApprovals.id, createdBatchId));
    }
    await db.delete(payables).where(eq(payables.id, pendingId));
    await db.delete(payables).where(eq(payables.id, blockedId));
  });

  it("cria o lote apenas com o payable pendente; o bloqueado fica de fora", async () => {
    await actingAs(IDS.superAdmin, ["super_admin"], []);
    const { createWeeklyBatch } = await import("../actions/approval");
    const result = await createWeeklyBatch({ weekOffset: WEEK_OFFSET });

    expect(result?.serverError).toBeUndefined();
    createdBatchId = result?.data?.batch?.id ?? null;
    expect(createdBatchId).toBeTruthy();
    expect(result?.data?.batch?.weekStart).toBe(weekStart);
    expect(result?.data?.batch?.weekEnd).toBe(weekEnd);

    const items = await db
      .select({ payableId: batchApprovalItems.payableId })
      .from(batchApprovalItems)
      .where(eq(batchApprovalItems.batchApprovalId, createdBatchId as string));
    const itemPayableIds = items.map((i) => i.payableId);

    expect(itemPayableIds).toContain(pendingId);
    expect(itemPayableIds).not.toContain(blockedId);
  });
});

describe("cancelPayable/cancelReceivable — cancelado permanece visível ao staff (P-3.9c)", () => {
  const COLABORADOR_ID = "cc150000-0000-0000-0000-000000000001";
  const payableId = "cc150000-0000-0000-0000-000000000010";
  const receivableId = "cc150000-0000-0000-0000-000000000011";

  beforeAll(async () => {
    await db
      .insert(users)
      .values({
        id: COLABORADOR_ID,
        email: "cancel-colab@test.hebron",
        fullName: "Cancel Colaborador",
      })
      .onConflictDoNothing();
    await db
      .insert(roleAssignments)
      .values({ userId: COLABORADOR_ID, role: "colaborador" })
      .onConflictDoNothing();

    await db.insert(payables).values({
      id: payableId,
      description: "Payable a cancelar — teste de visibilidade RLS",
      amount: "150.00",
      dueDate: "2099-01-01",
      status: "pendente",
      createdBy: COLABORADOR_ID,
    });
    await db.insert(receivables).values({
      id: receivableId,
      description: "Recebível a cancelar — teste de visibilidade RLS",
      amount: "75.00",
      status: "pendente",
      createdBy: COLABORADOR_ID,
    });
  });

  afterAll(async () => {
    await db.delete(auditLog).where(eq(auditLog.entityId, payableId));
    await db.delete(auditLog).where(eq(auditLog.entityId, receivableId));
    await db.delete(payables).where(eq(payables.id, payableId));
    await db.delete(receivables).where(eq(receivables.id, receivableId));
    await db
      .delete(roleAssignments)
      .where(eq(roleAssignments.userId, COLABORADOR_ID));
    await db.delete(users).where(eq(users.id, COLABORADOR_ID));
  });

  it("cancelPayable: colaborador cancela a própria conta; segue visível via RLS autenticada", async () => {
    await actingAs(COLABORADOR_ID, ["colaborador"], []);
    const { cancelPayable } = await import("../actions/transactions");
    const result = await cancelPayable({
      payableId,
      reason: "Fornecedor cancelou o pedido antes do pagamento.",
    });
    expect(result?.serverError).toBeUndefined();

    // Select via RLS autenticada (payables_select_staff filtra deleted_at IS
    // NULL) — se cancelPayable tivesse setado deleted_at, esta linha não
    // apareceria aqui (o bug que S-215 corrigiu).
    const rows = await withAuthenticatedContext(
      { actorId: COLABORADOR_ID },
      (tx) => tx.select().from(payables).where(eq(payables.id, payableId)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("cancelado");
    expect(rows[0]?.deletedAt).toBeNull();
    expect(rows[0]?.cancellationReason).toBeTruthy();

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, payableId));
    expect(
      audits.some((a) => a.action === "financeiro.payable.cancelled"),
    ).toBe(true);
  });

  it("cancelReceivable: colaborador cancela a própria conta; segue visível via RLS autenticada", async () => {
    await actingAs(COLABORADOR_ID, ["colaborador"], []);
    const { cancelReceivable } = await import("../actions/transactions");
    const result = await cancelReceivable({
      receivableId,
      reason: "Pagador desistiu antes do recebimento.",
    });
    expect(result?.serverError).toBeUndefined();

    const rows = await withAuthenticatedContext(
      { actorId: COLABORADOR_ID },
      (tx) =>
        tx.select().from(receivables).where(eq(receivables.id, receivableId)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("cancelado");
    expect(rows[0]?.deletedAt).toBeNull();
    expect(rows[0]?.notes).toContain("Pagador desistiu");

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, receivableId));
    expect(
      audits.some((a) => a.action === "financeiro.receivable.cancelled"),
    ).toBe(true);
  });
});

describe("Templates de email editáveis no Admin (P-3.10b)", () => {
  // BRAIN §5: "Templates de email com texto definido no Admin, editáveis" —
  // os três emails de Financeiro (batch-approval, budget-alert,
  // monthly-report) consultam admin.email_templates antes de renderizar o
  // componente React Email, no mesmo padrão de apps/projetos/src/lib/
  // notifications.ts (getDbTemplate/applyVars). Este describe garante que o
  // texto salvo pelo super_admin é de fato o que sai no email — não só que a
  // aba /configuracoes lista o slug.
  const YEAR = 2098;
  let createdBatchId: string | null = null;
  let createdPayableId: string | null = null;

  afterAll(async () => {
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.slug, "financeiro-budget-alert"));
    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.slug, "financeiro-batch-approval"));
    // O cost center/orçamento/transação de teste não são apagados: a
    // transação de teste é imutável (trigger forbid_transaction_mutation, o
    // mesmo padrão do ledgerTx de markPayableAsPaid acima) e referencia o
    // cost center via FK "restrict" — apagar um sem o outro quebra a
    // constraint. Cada execução gera um cost center novo (id do banco), sem
    // acumular estado entre execuções.
    if (createdBatchId) {
      await db
        .delete(batchApprovalItems)
        .where(eq(batchApprovalItems.batchApprovalId, createdBatchId));
      await db
        .delete(batchApprovals)
        .where(eq(batchApprovals.id, createdBatchId));
    }
    if (createdPayableId) {
      await db.delete(payables).where(eq(payables.id, createdPayableId));
    }
  });

  it("checkBudgetAlert usa o texto salvo em admin.email_templates quando existir", async () => {
    await db
      .insert(emailTemplates)
      .values({
        slug: "financeiro-budget-alert",
        subject: "TESTE OVERRIDE — {{centroCusto}} em {{percentual}}%",
        bodyHtml: "<p>override {{centroCusto}} {{ano}} {{percentual}}</p>",
        bodyText: "override",
        variables: ["centroCusto", "ano", "percentual"],
        updatedBy: IDS.superAdmin,
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: "TESTE OVERRIDE — {{centroCusto}} em {{percentual}}%",
          bodyHtml: "<p>override {{centroCusto}} {{ano}} {{percentual}}</p>",
        },
      });

    const [costCenter] = await db
      .insert(costCenters)
      .values({
        code: `CC-P310B-${Date.now()}`,
        name: "Centro de Custo Teste Override",
        budgetTotal: "1000.00",
      })
      .returning({ id: costCenters.id });
    if (!costCenter) throw new Error("Falha ao seedar cost center de teste");
    const costCenterId = costCenter.id;

    await db.insert(budgets).values({
      name: "Orçamento teste override",
      year: YEAR,
      costCenterId,
      totalAmount: "1000.00",
      createdBy: IDS.superAdmin,
    });
    await db.insert(transactions).values({
      type: "debito",
      amount: "850.00",
      description: "Débito de teste — cruza 80%",
      date: `${YEAR}-06-15`,
      accountId: ACCOUNT_ID,
      costCenterId,
      createdBy: IDS.superAdmin,
    });

    createNotificationMock.mockClear();
    const { checkBudgetAlert } = await import("../lib/notifications");
    await checkBudgetAlert({
      costCenterId,
      transactionDate: `${YEAR}-06-15`,
      newTransactionAmount: 850,
    });

    const emailCall = createNotificationMock.mock.calls.find(
      (call) =>
        (call[0] as { data: { userId: string; channel: string } }).data
          .userId === IDS.superAdmin &&
        (call[0] as { data: { channel: string } }).data.channel === "email",
    );
    expect(emailCall).toBeDefined();
    const email = (
      emailCall?.[0] as {
        email: { subject: string; html: string };
      }
    ).email;
    expect(email.subject).toBe(
      "TESTE OVERRIDE — Centro de Custo Teste Override em 85%",
    );
    expect(email.html).toContain("Centro de Custo Teste Override");
  });

  it("createWeeklyBatch usa o texto salvo em admin.email_templates para o email de lote", async () => {
    await db
      .insert(emailTemplates)
      .values({
        slug: "financeiro-batch-approval",
        subject: "TESTE OVERRIDE LOTE — {{quantidade}} conta(s)",
        bodyHtml:
          "<p>override {{semanaInicio}} {{semanaFim}} {{valorTotal}}</p>",
        bodyText: "override",
        variables: ["quantidade", "semanaInicio", "semanaFim", "valorTotal"],
        updatedBy: IDS.superAdmin,
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: "TESTE OVERRIDE LOTE — {{quantidade}} conta(s)",
          bodyHtml:
            "<p>override {{semanaInicio}} {{semanaFim}} {{valorTotal}}</p>",
        },
      });

    const WEEK_OFFSET = -4;
    const referenceDate = new Date();
    referenceDate.setDate(referenceDate.getDate() + WEEK_OFFSET * 7);
    const { weekStart } = getISOWeekBounds(referenceDate);

    const existingForWeek = await db
      .select({ id: batchApprovals.id })
      .from(batchApprovals)
      .where(eq(batchApprovals.weekStart, weekStart));
    for (const b of existingForWeek) {
      await db
        .delete(batchApprovalItems)
        .where(eq(batchApprovalItems.batchApprovalId, b.id));
      await db.delete(batchApprovals).where(eq(batchApprovals.id, b.id));
    }

    const [insertedPayable] = await db
      .insert(payables)
      .values({
        description: "Payable — teste override de template de lote",
        amount: "50.00",
        dueDate: weekStart,
        status: "pendente",
        createdBy: IDS.superAdmin,
      })
      .returning({ id: payables.id });
    if (!insertedPayable) throw new Error("Falha ao seedar payable de teste");
    createdPayableId = insertedPayable.id;

    createNotificationMock.mockClear();
    // O destinatário real do email de lote é o diretor gestor (designation
    // "gestor" = IDS.gestor, seedado no beforeAll externo do arquivo) — não
    // o super_admin que dispara a action (resolveWeeklyBatchRecipients).
    await actingAs(IDS.superAdmin, ["super_admin"], []);
    const { createWeeklyBatch } = await import("../actions/approval");
    const result = await createWeeklyBatch({ weekOffset: WEEK_OFFSET });
    expect(result?.serverError).toBeUndefined();

    createdBatchId = result?.data?.batch?.id ?? null;
    expect(createdBatchId).toBeTruthy();

    const emailCall = createNotificationMock.mock.calls.find(
      (call) =>
        (call[0] as { data: { userId: string; channel: string } }).data
          .userId === IDS.gestor &&
        (call[0] as { data: { channel: string } }).data.channel === "email",
    );
    expect(emailCall).toBeDefined();
    const email = (
      emailCall?.[0] as {
        email: { subject: string; html: string };
      }
    ).email;
    expect(email.subject).toBe("TESTE OVERRIDE LOTE — 1 conta(s)");
    expect(email.html).toContain(weekStart);
  });
});
