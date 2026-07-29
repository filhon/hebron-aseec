/**
 * attachments.test.ts — comprovante de despesa/receita (P-3.4b, corretivo).
 *
 * Antes deste prompt, ExpenseForm guardava só o nome do arquivo num
 * useState e createPayable não tinha campo nenhum para recebê-lo — o
 * comprovante nunca chegava ao bucket nem a financeiro.attachments, e
 * exportMonthlyReport (P-3.10) sempre devolvia um ZIP sem recibos e um
 * audit com receiptCount: 0 (um número que parecia informação e era só o
 * eco de um campo que ninguém preenchia). Este teste cobre a ponta a
 * ponta: createPayable/createReceivable persistem a referência na mesma
 * transação/audit da criação (ref_type='payable'/'receivable'), o registro
 * é lido de volta por queries.ts#getPayables (o que PayableCard usa para
 * decidir se mostra "Ver comprovante"), getAttachmentUrl resolve uma
 * signed URL de leitura, e exportMonthlyReport finalmente encontra algo
 * para colocar no ZIP.
 *
 * O upload em si (Storage) acontece no client, antes do submit — mesmo
 * contrato já provado em confirm-import.test.ts (fileUrl é só uma string
 * que a action persiste, nunca uma chamada a Storage). O client Storage
 * (@supabase/supabase-js::createClient) é mockado aqui só para
 * getAttachmentUrl (createSignedUrl) e exportMonthlyReport (download) —
 * mesmo padrão de apps/documentos/src/__tests__/actions.test.ts e
 * apps/tarefas/src/__tests__/attachments.test.ts — para não depender de
 * uma conexão real ao Supabase Storage.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  financialCategories,
  payables,
  receivables,
  financialAttachments,
  auditLog,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const IDS = {
  superAdmin: "af110000-0000-0000-0000-000000000001",
  colaborador: "af110000-0000-0000-0000-000000000002",
} as const;

let currentSession: {
  actorId: string;
  roles: string[];
  designations: string[];
} = {
  actorId: IDS.colaborador,
  roles: ["colaborador"],
  designations: [],
};

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(async () => currentSession),
}));

const MOCK_SIGNED_URL = "https://mock.storage/financeiro-recibos/signed";
const RECEIPT_BYTES = new TextEncoder().encode(
  "recibo de teste — P-3.4b",
).buffer;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: MOCK_SIGNED_URL },
          error: null,
        }),
        download: vi.fn().mockResolvedValue({
          data: { arrayBuffer: async () => RECEIPT_BYTES },
          error: null,
        }),
      }),
    },
  }),
}));

const EXPENSE_CATEGORY_CODE = "af.1";
const REVENUE_CATEGORY_CODE = "af.2";
let expenseCategoryId = "";
let revenueCategoryId = "";

const createdPayableIds = new Set<string>();
const createdReceivableIds = new Set<string>();

let payableWithAttachmentId = "";
let payableWithoutAttachmentId = "";

async function ensureCategory(
  code: string,
  type: "despesa" | "receita",
  name: string,
): Promise<string> {
  const existing = await db
    .select({ id: financialCategories.id })
    .from(financialCategories)
    .where(eq(financialCategories.code, code))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const [inserted] = await db
    .insert(financialCategories)
    .values({ code, name, type })
    .returning();
  if (!inserted) throw new Error(`Falha ao seedar categoria ${code}`);
  return inserted.id;
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.superAdmin,
        email: "attach-super@test.hebron",
        fullName: "Attach SuperAdmin",
      },
      {
        id: IDS.colaborador,
        email: "attach-colab@test.hebron",
        fullName: "Attach Colaborador",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      {
        userId: IDS.superAdmin,
        role: "super_admin",
        grantedBy: IDS.superAdmin,
      },
      {
        userId: IDS.colaborador,
        role: "colaborador",
        grantedBy: IDS.superAdmin,
      },
    ])
    .onConflictDoNothing();

  expenseCategoryId = await ensureCategory(
    EXPENSE_CATEGORY_CODE,
    "despesa",
    "Categoria teste despesa (P-3.4b)",
  );
  revenueCategoryId = await ensureCategory(
    REVENUE_CATEGORY_CODE,
    "receita",
    "Categoria teste receita (P-3.4b)",
  );
});

afterAll(async () => {
  const payableIds = Array.from(createdPayableIds);
  const receivableIds = Array.from(createdReceivableIds);
  const refIds = [...payableIds, ...receivableIds];

  if (refIds.length > 0) {
    await db
      .delete(financialAttachments)
      .where(inArray(financialAttachments.refId, refIds));
  }

  // audit_log referencia actor_id (FK) — precisa ser limpo antes dos users.
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, [IDS.superAdmin, IDS.colaborador]));

  if (payableIds.length > 0) {
    await db.delete(payables).where(inArray(payables.id, payableIds));
  }
  if (receivableIds.length > 0) {
    await db.delete(receivables).where(inArray(receivables.id, receivableIds));
  }

  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, [IDS.superAdmin, IDS.colaborador]));
  await db
    .delete(users)
    .where(inArray(users.id, [IDS.superAdmin, IDS.colaborador]));

  // As categorias-teste (af.1/af.2) ficam — infraestrutura reaproveitada
  // entre execuções, mesmo padrão da conta bancária em transactions.test.ts.
});

describe("createPayable — persiste o comprovante em financeiro.attachments", () => {
  it("grava a linha do anexo (ref_type='payable') na mesma criação, e ela volta em getPayables()", async () => {
    currentSession = {
      actorId: IDS.colaborador,
      roles: ["colaborador"],
      designations: [],
    };
    const { createPayable } = await import("../actions/transactions");
    const { getPayables } = await import("../lib/queries");

    const result = await createPayable({
      description: "Aluguel do salão de eventos — teste P-3.4b",
      supplierName: "Locador Teste Ltda",
      supplierCnpj: null,
      amount: 480.5,
      dueAt: new Date("2031-04-10"),
      categoryId: expenseCategoryId,
      costCenterId: null,
      projectId: null,
      notes: null,
      attachment: {
        path: `${IDS.colaborador}/recibo-despesa-teste.pdf`,
        fileName: "recibo-despesa-teste.pdf",
        fileSize: 4096,
      },
    });

    expect(result?.serverError).toBeUndefined();
    const payableId = result?.data?.payable?.id;
    expect(payableId).toBeTruthy();
    if (!payableId) throw new Error("payable ausente no resultado");
    createdPayableIds.add(payableId);
    payableWithAttachmentId = payableId;

    const attachmentRows = await db
      .select()
      .from(financialAttachments)
      .where(
        and(
          eq(financialAttachments.refType, "payable"),
          eq(financialAttachments.refId, payableId),
        ),
      );

    expect(attachmentRows).toHaveLength(1);
    expect(attachmentRows[0]?.fileUrl).toBe(
      `${IDS.colaborador}/recibo-despesa-teste.pdf`,
    );
    expect(attachmentRows[0]?.fileName).toBe("recibo-despesa-teste.pdf");
    expect(attachmentRows[0]?.uploadedBy).toBe(IDS.colaborador);

    // O mesmo anexo precisa voltar por getPayables() — é o que PayableCard
    // usa para decidir se mostra "Ver comprovante" (sem isso, a linha
    // existiria no banco mas a tela nunca saberia).
    const allPayables = await getPayables();
    const created = allPayables.find((p) => p.id === payableId);
    expect(created?.attachments).toHaveLength(1);
    expect(created?.attachments[0]?.fileName).toBe("recibo-despesa-teste.pdf");

    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, payableId));
    expect(
      audits.some(
        (a) =>
          a.action === "financeiro.payable.created" &&
          (a.diff as { attachmentId?: string } | null)?.attachmentId ===
            attachmentRows[0]?.id,
      ),
    ).toBe(true);
  });

  it("sem anexo, não cria nenhuma linha em financeiro.attachments (regressão do bug original)", async () => {
    currentSession = {
      actorId: IDS.colaborador,
      roles: ["colaborador"],
      designations: [],
    };
    const { createPayable } = await import("../actions/transactions");

    const result = await createPayable({
      description: "Despesa sem comprovante — teste P-3.4b",
      supplierName: "Fornecedor Sem Recibo",
      supplierCnpj: null,
      amount: 100,
      dueAt: new Date("2031-04-11"),
      categoryId: expenseCategoryId,
      costCenterId: null,
      projectId: null,
      notes: null,
      attachment: null,
    });

    expect(result?.serverError).toBeUndefined();
    const payableId = result?.data?.payable?.id;
    if (!payableId) throw new Error("payable ausente no resultado");
    createdPayableIds.add(payableId);
    payableWithoutAttachmentId = payableId;

    const attachmentRows = await db
      .select()
      .from(financialAttachments)
      .where(eq(financialAttachments.refId, payableId));
    expect(attachmentRows).toHaveLength(0);
  });
});

describe("createReceivable — persiste o comprovante em financeiro.attachments", () => {
  it("grava a linha do anexo (ref_type='receivable') na mesma criação", async () => {
    currentSession = {
      actorId: IDS.colaborador,
      roles: ["colaborador"],
      designations: [],
    };
    const { createReceivable } = await import("../actions/transactions");

    const result = await createReceivable({
      description: "Doação recorrente — teste P-3.4b",
      payerName: "Doador Teste",
      payerCnpj: null,
      amount: 300,
      expectedAt: new Date("2031-04-12"),
      categoryId: revenueCategoryId,
      costCenterId: null,
      bankAccountId: null,
      notes: null,
      attachment: {
        path: `${IDS.colaborador}/recibo-doacao-teste.pdf`,
        fileName: "recibo-doacao-teste.pdf",
        fileSize: 1024,
      },
    });

    expect(result?.serverError).toBeUndefined();
    const receivableId = result?.data?.receivable?.id;
    expect(receivableId).toBeTruthy();
    if (!receivableId) throw new Error("receivable ausente no resultado");
    createdReceivableIds.add(receivableId);

    const attachmentRows = await db
      .select()
      .from(financialAttachments)
      .where(
        and(
          eq(financialAttachments.refType, "receivable"),
          eq(financialAttachments.refId, receivableId),
        ),
      );

    expect(attachmentRows).toHaveLength(1);
    expect(attachmentRows[0]?.fileUrl).toBe(
      `${IDS.colaborador}/recibo-doacao-teste.pdf`,
    );
  });
});

describe("getAttachmentUrl — signed URL de leitura", () => {
  it("devolve a signed URL do comprovante do payable", async () => {
    currentSession = {
      actorId: IDS.colaborador,
      roles: ["colaborador"],
      designations: [],
    };
    if (!payableWithAttachmentId) {
      throw new Error("payableWithAttachmentId não foi seedado");
    }
    const { getAttachmentUrl } = await import("../actions/attachments");

    const result = await getAttachmentUrl({
      refType: "payable",
      refId: payableWithAttachmentId,
    });
    expect(result?.serverError).toBeUndefined();
    expect(result?.data?.url).toBe(MOCK_SIGNED_URL);
  });

  it("erro claro quando o registro não tem comprovante — não devolve URL vazia em silêncio", async () => {
    currentSession = {
      actorId: IDS.colaborador,
      roles: ["colaborador"],
      designations: [],
    };
    if (!payableWithoutAttachmentId) {
      throw new Error("payableWithoutAttachmentId não foi seedado");
    }
    const { getAttachmentUrl } = await import("../actions/attachments");

    const result = await getAttachmentUrl({
      refType: "payable",
      refId: payableWithoutAttachmentId,
    });
    expect(result?.serverError).toBeDefined();
  });
});

describe("exportMonthlyReport — ZIP mensal inclui o recibo, audit com receiptCount real", () => {
  const REPORT_YEAR = 2031;
  const REPORT_MONTH = 5;
  let reportPayableId = "";

  beforeAll(async () => {
    const [reportPayable] = await db
      .insert(payables)
      .values({
        description: "Despesa paga no mês do relatório — teste P-3.4b",
        amount: "150.00",
        dueDate: `${REPORT_YEAR}-0${REPORT_MONTH}-01`,
        status: "pago",
        paidAt: new Date(`${REPORT_YEAR}-0${REPORT_MONTH}-10T12:00:00.000Z`),
        categoryId: expenseCategoryId,
        createdBy: IDS.colaborador,
      })
      .returning();
    if (!reportPayable) {
      throw new Error("Falha ao seedar payable pago para teste de export");
    }
    reportPayableId = reportPayable.id;
    createdPayableIds.add(reportPayableId);

    await db.insert(financialAttachments).values({
      refType: "payable",
      refId: reportPayableId,
      fileUrl: `${IDS.colaborador}/recibo-export-teste.pdf`,
      fileName: "recibo-export-teste.pdf",
      fileSize: 2048,
      uploadedBy: IDS.colaborador,
    });
  });

  it("o ZIP exportado contém o recibo do payable pago no mês, e o audit registra receiptCount > 0", async () => {
    currentSession = {
      actorId: IDS.superAdmin,
      roles: ["super_admin"],
      designations: [],
    };
    const { exportMonthlyReport } = await import("../actions/reports");

    const result = await exportMonthlyReport({
      year: REPORT_YEAR,
      month: REPORT_MONTH,
    });
    expect(result?.serverError).toBeUndefined();
    const base64 = result?.data?.base64;
    expect(base64).toBeTruthy();
    if (!base64) throw new Error("ZIP ausente no resultado");

    // ZIP guarda o nome de cada entrada em texto puro no header local,
    // mesmo com o conteúdo comprimido — suficiente para provar que o
    // recibo foi incluído sem precisar de uma lib de leitura de ZIP.
    const zipText = Buffer.from(base64, "base64").toString("latin1");
    expect(zipText).toContain("recibos/recibo-export-teste.pdf");
    expect(reportPayableId).toBeTruthy();

    const audits = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorId, IDS.superAdmin),
          eq(auditLog.action, "financeiro.report.exported"),
        ),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    expect(audits).toHaveLength(1);
    const diff = audits[0]?.diff as {
      receiptCount?: number;
      year?: number;
      month?: number;
    } | null;
    expect(diff?.year).toBe(REPORT_YEAR);
    expect(diff?.month).toBe(REPORT_MONTH);
    expect(diff?.receiptCount).toBeGreaterThan(0);
  });
});
