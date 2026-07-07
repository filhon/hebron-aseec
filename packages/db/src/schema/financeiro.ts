import {
  boolean,
  date,
  index,
  integer,
  numeric,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { financeiroSchema, users } from "./public";
import { projects, organizations, paymentSchedules } from "./projetos";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const accountTypeEnum = financeiroSchema.enum("account_type", [
  "corrente",
  "poupanca",
  "investimento",
]);

export const financialCategoryTypeEnum = financeiroSchema.enum(
  "category_type",
  ["receita", "despesa"],
);

export const payableStatusEnum = financeiroSchema.enum("payable_status", [
  "pendente",
  "aprovado",
  "autorizado",
  "pago",
  "cancelado",
  // P-3.11 — bloqueio por inadimplência de relatório de projeto (BRAIN §6.2)
  "bloqueado",
]);

export const receivableStatusEnum = financeiroSchema.enum("receivable_status", [
  "pendente",
  "recebido",
  "cancelado",
]);

export const receivableSourceEnum = financeiroSchema.enum("receivable_source", [
  "farmacia",
  "aluguel",
  "doacao",
  "outro",
]);

export const transactionTypeEnum = financeiroSchema.enum("transaction_type", [
  "debito",
  "credito",
]);

export const importFormatEnum = financeiroSchema.enum("import_format", [
  "ofx",
  "csv",
]);

export const importRowStatusEnum = financeiroSchema.enum("import_row_status", [
  "unmatched",
  "matched",
  "ignored",
]);

export const attachmentRefTypeEnum = financeiroSchema.enum(
  "attachment_ref_type",
  ["payable", "receivable", "transaction"],
);

// ---------------------------------------------------------------------------
// financeiro.accounts — contas bancárias com saldo separado por conta
// ---------------------------------------------------------------------------
export const bankAccounts = financeiroSchema.table(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bankName: text("bank_name").notNull(),
    agency: text("agency"),
    accountNumber: text("account_number"),
    accountType: accountTypeEnum("account_type").notNull().default("corrente"),
    currency: text("currency").notNull().default("BRL"),
    initialBalance: numeric("initial_balance", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("accounts_is_active_idx").on(table.isActive)],
);

// ---------------------------------------------------------------------------
// financeiro.categories — plano de contas hierárquico (árvore)
// Defaults sugeridos inseridos via migration SQL; is_system = true = não deletável.
// ---------------------------------------------------------------------------
export const financialCategories = financeiroSchema.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: financialCategoryTypeEnum("type").notNull(),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => financialCategories.id,
      { onDelete: "set null" },
    ),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fin_categories_type_idx").on(table.type),
    index("fin_categories_parent_id_idx").on(table.parentId),
    unique("fin_categories_code_uniq").on(table.code),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.cost_centers — 1 por projeto aprovado; criado automaticamente
// Cross-schema FK: projetos.projects
// ---------------------------------------------------------------------------
export const costCenters = financeiroSchema.table(
  "cost_centers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .unique()
      .references(() => projects.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    budgetTotal: numeric("budget_total", { precision: 12, scale: 2 }).notNull(),
    status: text("status", { enum: ["ativo", "suspenso", "encerrado"] })
      .notNull()
      .default("ativo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("cost_centers_project_id_idx").on(table.projectId),
    index("cost_centers_status_idx").on(table.status),
    unique("cost_centers_code_uniq").on(table.code),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.budgets — orçamento anual por centro de custo
// ---------------------------------------------------------------------------
export const budgets = financeiroSchema.table(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    year: integer("year").notNull(),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, {
      onDelete: "restrict",
    }),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("budgets_year_idx").on(table.year),
    index("budgets_cost_center_id_idx").on(table.costCenterId),
    unique("budgets_year_cost_center_uniq").on(table.year, table.costCenterId),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.budget_items — linhas orçamentárias por categoria
// ---------------------------------------------------------------------------
export const budgetItems = financeiroSchema.table(
  "budget_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => financialCategories.id, {
      onDelete: "restrict",
    }),
    plannedAmount: numeric("planned_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("budget_items_budget_id_idx").on(table.budgetId),
    index("budget_items_category_id_idx").on(table.categoryId),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.payables — contas a pagar
// Governança dual: pendente → aprovado (diretor gestor) → autorizado (super_admin) → pago
// ---------------------------------------------------------------------------
export const payables = financeiroSchema.table(
  "payables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    supplier: text("supplier"),
    notes: text("notes"),
    accountId: uuid("account_id").references(() => bankAccounts.id, {
      onDelete: "restrict",
    }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => financialCategories.id, {
      onDelete: "restrict",
    }),
    // Cross-schema FK: liga o payable à parcela de projeto que o originou
    // (P-3.11 — aprovação de projeto cria payables reais). UNIQUE garante
    // no máximo 1 payable por parcela (idempotência da criação automática).
    paymentScheduleId: uuid("payment_schedule_id")
      .unique()
      .references(() => paymentSchedules.id, { onDelete: "restrict" }),
    status: payableStatusEnum("status").notNull().default("pendente"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    authorizedBy: uuid("authorized_by").references(() => users.id),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    paidBy: uuid("paid_by").references(() => users.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    // Bloqueio por inadimplência de relatório (P-3.11, BRAIN §6.2) e override
    // exclusivo de super_admin, com justificativa obrigatória.
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    blockReason: text("block_reason"),
    overriddenBy: uuid("overridden_by").references(() => users.id),
    overriddenAt: timestamp("overridden_at", { withTimezone: true }),
    overrideJustification: text("override_justification"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("payables_status_idx").on(table.status),
    index("payables_due_date_idx").on(table.dueDate),
    index("payables_cost_center_id_idx").on(table.costCenterId),
    index("payables_category_id_idx").on(table.categoryId),
    index("payables_created_by_idx").on(table.createdBy),
    index("payables_deleted_at_idx").on(table.deletedAt),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.receivables — contas a receber
// ---------------------------------------------------------------------------
export const receivables = financeiroSchema.table(
  "receivables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    expectedDate: date("expected_date"),
    receivedDate: date("received_date"),
    accountId: uuid("account_id").references(() => bankAccounts.id, {
      onDelete: "restrict",
    }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => financialCategories.id, {
      onDelete: "restrict",
    }),
    source: receivableSourceEnum("source").notNull().default("outro"),
    notes: text("notes"),
    status: receivableStatusEnum("status").notNull().default("pendente"),
    receivedBy: uuid("received_by").references(() => users.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("receivables_status_idx").on(table.status),
    index("receivables_source_idx").on(table.source),
    index("receivables_expected_date_idx").on(table.expectedDate),
    index("receivables_cost_center_id_idx").on(table.costCenterId),
    index("receivables_deleted_at_idx").on(table.deletedAt),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.transactions — ledger imutável
// Imutabilidade: sem UPDATE ou DELETE — enforced via trigger BEFORE UPDATE/DELETE
// reference_type + reference_id: referência polimórfica (payable/receivable/reversal/manual)
// ---------------------------------------------------------------------------
export const transactions = financeiroSchema.table(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description").notNull(),
    date: date("date").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => bankAccounts.id, { onDelete: "restrict" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => financialCategories.id, {
      onDelete: "restrict",
    }),
    referenceType: text("reference_type", {
      enum: ["payable", "receivable", "reversal", "manual"],
    }),
    referenceId: uuid("reference_id"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_date_idx").on(table.date),
    index("transactions_type_idx").on(table.type),
    index("transactions_cost_center_id_idx").on(table.costCenterId),
    index("transactions_reference_idx").on(
      table.referenceType,
      table.referenceId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.transaction_reversals — estornos com justificativa obrigatória
// Uma reversão por transaction original (UNIQUE); justificativa não pode ser nula.
// ---------------------------------------------------------------------------
export const transactionReversals = financeiroSchema.table(
  "transaction_reversals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originalTransactionId: uuid("original_transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "restrict" }),
    reversalTransactionId: uuid("reversal_transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "restrict" }),
    justification: text("justification").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transaction_reversals_original_idx").on(table.originalTransactionId),
    unique("transaction_reversals_original_uniq").on(
      table.originalTransactionId,
    ),
    unique("transaction_reversals_reversal_uniq").on(
      table.reversalTransactionId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.attachments — anexos polimórficos (NF, comprovantes, recibos)
// ---------------------------------------------------------------------------
export const financialAttachments = financeiroSchema.table(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    refType: attachmentRefTypeEnum("ref_type").notNull(),
    refId: uuid("ref_id").notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("attachments_ref_idx").on(table.refType, table.refId)],
);

// ---------------------------------------------------------------------------
// financeiro.bank_imports — importações de extrato OFX/CSV
// ---------------------------------------------------------------------------
export const bankImports = financeiroSchema.table(
  "bank_imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => bankAccounts.id, { onDelete: "restrict" }),
    fileUrl: text("file_url").notNull(),
    format: importFormatEnum("format").notNull(),
    importedBy: uuid("imported_by")
      .notNull()
      .references(() => users.id),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rowCount: integer("row_count").notNull().default(0),
    matchedCount: integer("matched_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bank_imports_account_id_idx").on(table.accountId),
    index("bank_imports_imported_at_idx").on(table.importedAt),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.bank_import_rows — linhas parseadas do extrato
// date, amount, description: dados extraídos do arquivo OFX/CSV
// ---------------------------------------------------------------------------
export const bankImportRows = financeiroSchema.table(
  "bank_import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bankImportId: uuid("bank_import_id")
      .notNull()
      .references(() => bankImports.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    matchTransactionId: uuid("match_transaction_id").references(
      () => transactions.id,
      { onDelete: "set null" },
    ),
    status: importRowStatusEnum("status").notNull().default("unmatched"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bank_import_rows_bank_import_id_idx").on(table.bankImportId),
    index("bank_import_rows_status_idx").on(table.status),
    index("bank_import_rows_match_transaction_id_idx").on(
      table.matchTransactionId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.batch_approvals — lote semanal de pagamentos para aprovação dual
// week_start + week_end: período da semana; UNIQUE garante 1 lote por semana.
// ---------------------------------------------------------------------------
export const batchApprovals = financeiroSchema.table(
  "batch_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekStart: date("week_start").notNull(),
    weekEnd: date("week_end").notNull(),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    authorizedBy: uuid("authorized_by").references(() => users.id),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("batch_approvals_week_start_idx").on(table.weekStart),
    unique("batch_approvals_week_uniq").on(table.weekStart, table.weekEnd),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.batch_approval_items — payables incluídos no lote semanal
// ---------------------------------------------------------------------------
export const batchApprovalItems = financeiroSchema.table(
  "batch_approval_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchApprovalId: uuid("batch_approval_id")
      .notNull()
      .references(() => batchApprovals.id, { onDelete: "cascade" }),
    payableId: uuid("payable_id")
      .notNull()
      .references(() => payables.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("batch_approval_items_batch_id_idx").on(table.batchApprovalId),
    index("batch_approval_items_payable_id_idx").on(table.payableId),
    unique("batch_approval_items_uniq").on(
      table.batchApprovalId,
      table.payableId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// financeiro.organization_budgets — teto de orçamento por instituição/ano
// (S1-01): fonte de verdade para checkOrganizationBudget (apps/projetos),
// substituindo o workaround em admin.system_settings.
// ---------------------------------------------------------------------------
export const organizationBudgets = financeiroSchema.table(
  "organization_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("organization_budgets_org_id_idx").on(table.organizationId),
    unique("organization_budgets_org_year_uniq").on(
      table.organizationId,
      table.year,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
export type FinancialCategory = typeof financialCategories.$inferSelect;
export type NewFinancialCategory = typeof financialCategories.$inferInsert;
export type CostCenter = typeof costCenters.$inferSelect;
export type NewCostCenter = typeof costCenters.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetItem = typeof budgetItems.$inferSelect;
export type NewBudgetItem = typeof budgetItems.$inferInsert;
export type Payable = typeof payables.$inferSelect;
export type NewPayable = typeof payables.$inferInsert;
export type Receivable = typeof receivables.$inferSelect;
export type NewReceivable = typeof receivables.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionReversal = typeof transactionReversals.$inferSelect;
export type NewTransactionReversal = typeof transactionReversals.$inferInsert;
export type FinancialAttachment = typeof financialAttachments.$inferSelect;
export type NewFinancialAttachment = typeof financialAttachments.$inferInsert;
export type BankImport = typeof bankImports.$inferSelect;
export type NewBankImport = typeof bankImports.$inferInsert;
export type BankImportRow = typeof bankImportRows.$inferSelect;
export type NewBankImportRow = typeof bankImportRows.$inferInsert;
export type BatchApproval = typeof batchApprovals.$inferSelect;
export type NewBatchApproval = typeof batchApprovals.$inferInsert;
export type BatchApprovalItem = typeof batchApprovalItems.$inferSelect;
export type NewBatchApprovalItem = typeof batchApprovalItems.$inferInsert;
export type OrganizationBudget = typeof organizationBudgets.$inferSelect;
export type NewOrganizationBudget = typeof organizationBudgets.$inferInsert;
