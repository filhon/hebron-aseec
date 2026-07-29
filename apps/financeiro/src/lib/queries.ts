import { cookies } from "next/headers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  createSupabaseServerActionClient,
  resolveSession,
} from "@hebron/auth/server";
import {
  withAuthenticatedContext,
  withSystemRole,
  type AuthenticatedTx,
} from "@hebron/db/authenticated";
import {
  bankAccounts,
  financialCategories,
  costCenters,
  budgets,
  budgetItems,
  payables,
  receivables,
  transactions,
  transactionReversals,
  bankImports,
  bankImportRows,
  batchApprovals,
  batchApprovalItems,
  financialAttachments,
  users,
} from "@hebron/db/schema";
import type {
  AccountCategory,
  BankAccount,
  Payable,
  Budget,
  BatchApproval,
  Transaction,
  BankImport,
  BankImportItem,
  Attachment,
} from "@hebron/types/financeiro";

// ---------------------------------------------------------------------------
// Auth — mirrors the pattern in apps/projetos/src/lib/queries.ts
// ---------------------------------------------------------------------------

export async function getAuthUser(): Promise<{
  id: string;
  fullName: string | null;
  email: string | null;
} | null> {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Component — não pode setar cookies, ignorar
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return {
    id: user.id,
    fullName: rows[0]?.fullName ?? null,
    email: user.email ?? null,
  };
}

async function getActorId(): Promise<string> {
  const cookieStore = await cookies();
  const { actorId } = await resolveSession(cookieStore);
  return actorId;
}

// public.users só tem policy de SELECT "auth.uid() = id" (self) ou
// super_admin/diretor (0000_initial.sql) — colaborador não tem policy para
// ler o nome de terceiros. getUsersMap só expõe fullName (não é dado
// sensível) para rotular approvedByName/authorizedByName/createdBy em telas
// que colaborador já pode ver via payables_select_staff etc. — mesmo padrão
// de exceção service-level documentado em admin/actions (F3-15/S-57).
async function getUsersMap(): Promise<Map<string, string>> {
  const actorId = await getActorId();
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    withSystemRole(tx, (sysTx) =>
      sysTx.select({ id: users.id, fullName: users.fullName }).from(users),
    ),
  );
  return new Map(rows.map((r) => [r.id, r.fullName ?? "—"]));
}

// ---------------------------------------------------------------------------
// Bank accounts — currentBalance is derived from the immutable ledger, never
// stored directly (initial_balance + sum of credits − sum of debits).
// ---------------------------------------------------------------------------

export async function getBankAccounts(): Promise<BankAccount[]> {
  const actorId = await getActorId();
  const { accounts, balanceRows } = await withAuthenticatedContext(
    { actorId },
    async (tx) => {
      const accounts = await tx.select().from(bankAccounts);

      const balanceRows = await tx
        .select({
          accountId: transactions.accountId,
          delta: sql<string>`sum(case when ${transactions.type} = 'credito' then ${transactions.amount} else -${transactions.amount} end)`,
        })
        .from(transactions)
        .groupBy(transactions.accountId);

      return { accounts, balanceRows };
    },
  );

  const deltaByAccount = new Map(
    balanceRows.map((r) => [r.accountId, parseFloat(r.delta ?? "0")]),
  );

  return accounts.map((a) => ({
    id: a.id,
    name: a.bankName,
    bank: a.bankName,
    agency: a.agency ?? "",
    accountNumber: a.accountNumber ?? "",
    type: a.accountType,
    currentBalance:
      parseFloat(a.initialBalance) + (deltaByAccount.get(a.id) ?? 0),
    isActive: a.isActive,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// Plano de contas — level é derivado do código (1 / 1.1 / 1.1.1); a tabela
// não tem coluna isActive (sempre true — não há soft-delete de categoria).
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<AccountCategory[]> {
  const actorId = await getActorId();
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx.select().from(financialCategories),
  );

  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    parentId: c.parentId,
    level: Math.min(c.code.split(".").length, 3) as 1 | 2 | 3,
    isActive: true,
    isSystem: c.isSystem,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// Cost centers — 1:1 com projeto aprovado (financeiro.cost_centers.project_id
// é NOT NULL); centros administrativos ainda não existem até P-3.11 criar o
// fluxo cross-app. Formato reduzido: só os campos usados pelos selects.
// ---------------------------------------------------------------------------

export interface CostCenterOption {
  id: string;
  code: string;
  name: string;
  projectId: string;
}

export async function getCostCenterOptions(): Promise<CostCenterOption[]> {
  const actorId = await getActorId();
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
        projectId: costCenters.projectId,
      })
      .from(costCenters),
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Transactions (ledger imutável) — reconciledAt/reconciledBy e isReversed são
// derivados (não há colunas próprias): uma transação é "conciliada" quando
// uma linha de bank_import_rows aponta para ela; é estornada quando existe um
// registro em transaction_reversals apontando para ela como original.
// ---------------------------------------------------------------------------

export async function getTransactions(): Promise<Transaction[]> {
  const actorId = await getActorId();
  const { rows, reversalRows, matchedRows } = await withAuthenticatedContext(
    { actorId },
    async (tx) => {
      const rows = await tx.select().from(transactions);
      const reversalRows = await tx.select().from(transactionReversals);
      const matchedRows = await tx
        .select({
          transactionId: bankImportRows.matchTransactionId,
          bankImportId: bankImportRows.bankImportId,
        })
        .from(bankImportRows)
        .where(eq(bankImportRows.status, "matched"));

      return { rows, reversalRows, matchedRows };
    },
  );

  const reversedIds = new Set(reversalRows.map((r) => r.originalTransactionId));
  const reversalOfByTx = new Map(
    reversalRows.map((r) => [r.reversalTransactionId, r.originalTransactionId]),
  );

  const matchByTx = new Map(
    matchedRows
      .filter((r) => r.transactionId !== null)
      .map((r) => [r.transactionId as string, r.bankImportId]),
  );

  return rows.map((t) => ({
    id: t.id,
    bankAccountId: t.accountId,
    type: t.type,
    amount: parseFloat(t.amount),
    description: t.description,
    occurredAt: new Date(t.date),
    categoryId: t.categoryId,
    costCenterId: t.costCenterId,
    payableId: t.referenceType === "payable" ? t.referenceId : null,
    receivableId: t.referenceType === "receivable" ? t.referenceId : null,
    bankImportId: matchByTx.get(t.id) ?? null,
    externalRef: null,
    reconciledAt: matchByTx.has(t.id) ? t.createdAt : null,
    reconciledBy: matchByTx.has(t.id) ? t.createdBy : null,
    reversalOf: reversalOfByTx.get(t.id) ?? null,
    isReversed: reversedIds.has(t.id),
    notes: null,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// financialAttachments (DB) → Attachment (packages/types) — mapeamento entre
// as colunas polimórficas (ref_type/ref_id/file_url/file_size) e a interface
// já publicada em @hebron/types/financeiro. mime_type não é persistido (a
// tabela não tem essa coluna) — derivado da extensão do arquivo.
// ---------------------------------------------------------------------------

function mimeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function toAttachment(
  row: typeof financialAttachments.$inferSelect,
): Attachment {
  return {
    id: row.id,
    parentType: row.refType,
    parentId: row.refId,
    storageKey: row.fileUrl,
    fileName: row.fileName,
    fileSizeBytes: row.fileSize ?? 0,
    mimeType: mimeFromFileName(row.fileName),
    uploadedBy: row.uploadedBy,
    uploadedAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Payables — junta nomes de aprovador/autorizador, o lote (se houver) e a
// transação de pagamento. cancellationReason/cancelledBy não são persistidos
// pela action cancelPayable (só vão para o audit log) — permanecem null aqui.
// ---------------------------------------------------------------------------

export async function getPayables(): Promise<Payable[]> {
  const actorId = await getActorId();
  const usersMap = await getUsersMap();

  const { rows, ccRows, batchItemRows, paidTxRows, attachmentRows } =
    await withAuthenticatedContext({ actorId }, async (tx) => {
      const rows = await tx.select().from(payables);

      const ccRows = await tx
        .select({ id: costCenters.id, projectId: costCenters.projectId })
        .from(costCenters);

      const batchItemRows = await tx.select().from(batchApprovalItems);

      const paidTxRows = await tx
        .select({ id: transactions.id, referenceId: transactions.referenceId })
        .from(transactions)
        .where(eq(transactions.referenceType, "payable"));

      const attachmentRows = await tx
        .select()
        .from(financialAttachments)
        .where(eq(financialAttachments.refType, "payable"));

      return { rows, ccRows, batchItemRows, paidTxRows, attachmentRows };
    });

  const projectByCc = new Map(ccRows.map((c) => [c.id, c.projectId]));

  const batchByPayable = new Map(
    batchItemRows.map((b) => [b.payableId, b.batchApprovalId]),
  );

  const paidTxByPayable = new Map(
    paidTxRows
      .filter((r) => r.referenceId !== null)
      .map((r) => [r.referenceId as string, r.id]),
  );

  const attachmentsByPayable = new Map<string, Attachment[]>();
  for (const row of attachmentRows) {
    const list = attachmentsByPayable.get(row.refId) ?? [];
    list.push(toAttachment(row));
    attachmentsByPayable.set(row.refId, list);
  }

  return rows.map((p) => ({
    id: p.id,
    description: p.description,
    supplierName: p.supplier ?? "",
    supplierCnpj: null,
    amount: parseFloat(p.amount),
    dueAt: new Date(p.dueDate),
    status: p.status,
    categoryId: p.categoryId ?? "",
    costCenterId: p.costCenterId,
    projectId: p.costCenterId
      ? (projectByCc.get(p.costCenterId) ?? null)
      : null,
    batchApprovalId: batchByPayable.get(p.id) ?? null,
    attachments: attachmentsByPayable.get(p.id) ?? [],
    approvedBy: p.approvedBy,
    approvedByName: p.approvedBy ? (usersMap.get(p.approvedBy) ?? null) : null,
    approvedAt: p.approvedAt,
    authorizedBy: p.authorizedBy,
    authorizedByName: p.authorizedBy
      ? (usersMap.get(p.authorizedBy) ?? null)
      : null,
    authorizedAt: p.authorizedAt,
    paidAt: p.paidAt,
    paidByTransactionId: paidTxByPayable.get(p.id) ?? null,
    cancelledAt: p.status === "cancelado" ? p.deletedAt : null,
    cancelledBy: null,
    cancellationReason: null,
    notes: p.notes,
    createdBy: p.createdBy,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// Receivables — description já vem "descrição — pagador" (P-3.9b:
// createReceivable concatena o payerName na descrição; não há coluna própria).
// ---------------------------------------------------------------------------

export interface ReceivableRow {
  id: string;
  description: string;
  amount: number;
  expectedAt: Date | null;
  receivedAt: Date | null;
  status: "pendente" | "recebido" | "cancelado";
  categoryId: string | null;
  categoryName: string | null;
  costCenterId: string | null;
  bankAccountId: string | null;
  notes: string | null;
  createdAt: Date;
}

export async function getReceivables(): Promise<ReceivableRow[]> {
  const actorId = await getActorId();
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select({
        id: receivables.id,
        description: receivables.description,
        amount: receivables.amount,
        expectedDate: receivables.expectedDate,
        receivedDate: receivables.receivedDate,
        status: receivables.status,
        categoryId: receivables.categoryId,
        categoryName: financialCategories.name,
        costCenterId: receivables.costCenterId,
        bankAccountId: receivables.accountId,
        notes: receivables.notes,
        createdAt: receivables.createdAt,
      })
      .from(receivables)
      .leftJoin(
        financialCategories,
        eq(financialCategories.id, receivables.categoryId),
      ),
  );

  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    amount: parseFloat(r.amount),
    expectedAt: r.expectedDate ? new Date(r.expectedDate) : null,
    receivedAt: r.receivedDate ? new Date(r.receivedDate) : null,
    status: r.status,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    costCenterId: r.costCenterId,
    bankAccountId: r.bankAccountId,
    notes: r.notes,
    createdAt: r.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// Budgets — o nome vem prefixado em notes ("Budget: <nome>", P-3.6); month
// não é persistido em budget_items (gap do Bloco B, registrado em
// SESSIONS.md) — vem sempre null aqui.
// ---------------------------------------------------------------------------

export async function getBudgets(): Promise<Budget[]> {
  const actorId = await getActorId();
  const { budgetRows, itemRows, ccRows } = await withAuthenticatedContext(
    { actorId },
    async (tx) => {
      const budgetRows = await tx.select().from(budgets);
      const itemRows = await tx
        .select({
          id: budgetItems.id,
          budgetId: budgetItems.budgetId,
          categoryId: budgetItems.categoryId,
          categoryName: financialCategories.name,
          plannedAmount: budgetItems.plannedAmount,
          description: budgetItems.description,
        })
        .from(budgetItems)
        .leftJoin(
          financialCategories,
          eq(financialCategories.id, budgetItems.categoryId),
        );
      const ccRows = await tx
        .select({ id: costCenters.id, projectId: costCenters.projectId })
        .from(costCenters);

      return { budgetRows, itemRows, ccRows };
    },
  );

  const itemsByBudget = new Map<string, Budget["items"]>();
  for (const item of itemRows) {
    const list = itemsByBudget.get(item.budgetId) ?? [];
    list.push({
      id: item.id,
      budgetId: item.budgetId,
      categoryId: item.categoryId ?? "",
      categoryName: item.categoryName ?? "—",
      description: item.description ?? "",
      plannedAmount: parseFloat(item.plannedAmount),
      month: null,
      notes: null,
    });
    itemsByBudget.set(item.budgetId, list);
  }

  const projectByCc = new Map(ccRows.map((c) => [c.id, c.projectId]));

  return budgetRows.map((b) => {
    const firstLine = (b.notes ?? "").split("\n")[0] ?? "";
    const name = firstLine.startsWith("Budget: ")
      ? firstLine.slice("Budget: ".length)
      : firstLine || "Orçamento sem nome";

    return {
      id: b.id,
      name,
      year: b.year,
      projectId: b.costCenterId
        ? (projectByCc.get(b.costCenterId) ?? null)
        : null,
      costCenterId: b.costCenterId,
      totalAmount: parseFloat(b.totalAmount),
      isActive: true,
      approvedBy: null,
      approvedAt: null,
      items: itemsByBudget.get(b.id) ?? [],
      createdBy: b.createdBy,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Batch approvals — status reaproveita o enum da UI (parcialmente_aprovado
// sinaliza "autorizado" aqui, já que o enum original não tem um valor para
// esse estágio e nenhuma tela lê esse status pós-autorização).
// ---------------------------------------------------------------------------

export async function getBatchApprovals(): Promise<BatchApproval[]> {
  const actorId = await getActorId();
  const allPayables = await getPayables();
  const usersMap = await getUsersMap();

  const { batchRows, itemRows } = await withAuthenticatedContext(
    { actorId },
    async (tx) => {
      const batchRows = await tx.select().from(batchApprovals);
      const itemRows = await tx.select().from(batchApprovalItems);
      return { batchRows, itemRows };
    },
  );

  const payableIdsByBatch = new Map<string, string[]>();
  for (const item of itemRows) {
    const list = payableIdsByBatch.get(item.batchApprovalId) ?? [];
    list.push(item.payableId);
    payableIdsByBatch.set(item.batchApprovalId, list);
  }

  const payablesById = new Map(allPayables.map((p) => [p.id, p]));

  return batchRows.map((b) => {
    const payableIds = payableIdsByBatch.get(b.id) ?? [];
    const batchPayables = payableIds
      .map((id) => payablesById.get(id))
      .filter((p): p is Payable => p !== undefined);
    const totalAmount = batchPayables.reduce((s, p) => s + p.amount, 0);

    const status: BatchApproval["status"] = !b.approvedAt
      ? "pendente"
      : !b.authorizedAt
        ? "aprovado"
        : "parcialmente_aprovado";

    return {
      id: b.id,
      weekStart: new Date(b.weekStart),
      weekEnd: new Date(b.weekEnd),
      payables: batchPayables,
      totalAmount,
      status,
      approvalRequestSentAt: null,
      approvedBy: b.approvedBy,
      approvedByName: b.approvedBy
        ? (usersMap.get(b.approvedBy) ?? null)
        : null,
      approvedAt: b.approvedAt,
      authorizationRequestSentAt: null,
      authorizedBy: b.authorizedBy,
      authorizedByName: b.authorizedBy
        ? (usersMap.get(b.authorizedBy) ?? null)
        : null,
      authorizedAt: b.authorizedAt,
      notes: null,
      createdAt: b.createdAt,
      updatedAt: b.createdAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Conciliação — retorna o import mais recente com pendências (ou o mais
// recente de todos, se nenhum tiver pendências) já no formato de BankImport
// usado pelo ConciliationView.
// ---------------------------------------------------------------------------

export async function getLatestBankImport(): Promise<{
  bankImport: BankImport;
  bankAccount: BankAccount;
} | null> {
  const actorId = await getActorId();
  const allImports = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select()
      .from(bankImports)
      .orderBy(sql`${bankImports.importedAt} desc`),
  );

  if (allImports.length === 0) return null;

  const withPending = allImports.find((i) => i.matchedCount < i.rowCount);
  const chosen = withPending ?? allImports[0];
  if (!chosen) return null;

  const accounts = await getBankAccounts();
  const bankAccount = accounts.find((a) => a.id === chosen.accountId);
  if (!bankAccount) return null;

  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select()
      .from(bankImportRows)
      .where(eq(bankImportRows.bankImportId, chosen.id)),
  );

  const ignoredCount = rows.filter((r) => r.status === "ignored").length;
  const matchedCount = rows.filter((r) => r.status === "matched").length;
  const pendingCount = rows.length - matchedCount - ignoredCount;

  const items: BankImportItem[] = rows.map((r) => {
    const amount = parseFloat(r.amount);
    return {
      id: r.id,
      bankImportId: r.bankImportId,
      externalRef: null,
      occurredAt: new Date(r.date),
      description: r.description ?? "Lançamento importado",
      amount: Math.abs(amount),
      type: amount >= 0 ? "credito" : "debito",
      matchStatus:
        r.status === "matched"
          ? "vinculado"
          : r.status === "ignored"
            ? "ignorado"
            : "pendente",
      matchType: r.matchTransactionId ? "automatico" : null,
      transactionId: r.matchTransactionId,
      suggestedPayableId: null,
      suggestedReceivableId: null,
    };
  });

  const fileName = chosen.fileUrl.split("/").pop() ?? chosen.fileUrl;

  const bankImport: BankImport = {
    id: chosen.id,
    bankAccountId: chosen.accountId,
    format: chosen.format,
    fileName,
    status: pendingCount === 0 ? "concluido" : "pendente",
    totalItems: rows.length,
    matchedItems: matchedCount,
    ignoredItems: ignoredCount,
    pendingItems: pendingCount,
    importedBy: chosen.importedBy,
    importedAt: chosen.importedAt,
    processedAt: null,
    items,
  };

  return { bankImport, bankAccount };
}

export async function getTransactionsForAccount(
  accountId: string,
): Promise<Transaction[]> {
  const all = await getTransactions();
  return all.filter((t) => t.bankAccountId === accountId);
}

// ---------------------------------------------------------------------------
// getPayableOrThrow / getTransactionOrThrow — helpers de lookup usados pelas
// actions de governança (approval.ts, transactions.ts). Recebem `tx` (o
// AuthenticatedTx já aberto pelo chamador via withAuthenticatedContext) em
// vez de abrirem seu próprio contexto — antes duplicados como funções locais
// rodando sobre `db` cru em cada arquivo (P-9.1b-2/S-02).
// ---------------------------------------------------------------------------

export async function getPayableOrThrow(
  tx: AuthenticatedTx,
  payableId: string,
) {
  const rows = await tx
    .select()
    .from(payables)
    .where(and(eq(payables.id, payableId), isNull(payables.deletedAt)))
    .limit(1);

  const payable = rows[0];
  if (!payable) throw new Error("Conta a pagar não encontrada");
  return payable;
}

export async function getTransactionOrThrow(
  tx: AuthenticatedTx,
  transactionId: string,
) {
  const rows = await tx
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  const transaction = rows[0];
  if (!transaction) throw new Error("Transação não encontrada");
  return transaction;
}
