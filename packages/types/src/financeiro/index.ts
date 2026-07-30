// ─── TransactionType ──────────────────────────────────────────────────────────

export type TransactionType = "credito" | "debito";

// ─── BankAccountType ──────────────────────────────────────────────────────────

export type BankAccountType = "corrente" | "poupanca" | "investimento";

// ─── BankAccount ──────────────────────────────────────────────────────────────

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  agency: string;
  accountNumber: string;
  type: BankAccountType;
  /** Derived from transactions — never stored directly */
  currentBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── CostCenter ───────────────────────────────────────────────────────────────
// Linked to projetos.projects when created by project approval flow.

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  /** References projetos.projects.id — null for administrative cost centers */
  projectId: string | null;
  isActive: boolean;
  createdBy: string; // user ID
  createdAt: Date;
  updatedAt: Date;
}

// ─── AccountCategoryType ──────────────────────────────────────────────────────

export type AccountCategoryType = "receita" | "despesa";

// ─── AccountCategory (Plano de Contas) ───────────────────────────────────────
// Hierarchical chart of accounts. Root nodes have parentId = null, level = 1.

export interface AccountCategory {
  id: string;
  /** Structured code, e.g. "1", "1.1", "1.1.1" */
  code: string;
  name: string;
  type: AccountCategoryType;
  /** Null for root-level categories */
  parentId: string | null;
  /** 1 = root, 2 = group, 3 = account (leaf) */
  level: 1 | 2 | 3;
  isActive: boolean;
  /** Seed category from the migration — cannot be deleted (BRAIN §6) */
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── PayableStatus ────────────────────────────────────────────────────────────
// Linear lifecycle: pendente → aprovado → autorizado → pago
// cancelado can be reached from any state before pago.
// bloqueado: report-delinquency block (BRAIN §6.2, P-3.11) — only reachable
// from pendente; returns to pendente via super_admin override.

export type PayableStatus =
  | "pendente"
  | "aprovado"
  | "autorizado"
  | "pago"
  | "cancelado"
  | "bloqueado";

// ─── Attachment ───────────────────────────────────────────────────────────────

export type AttachmentParentType =
  | "payable"
  | "receivable"
  | "transaction"
  | "bank_import";

export interface Attachment {
  id: string;
  parentType: AttachmentParentType;
  parentId: string;
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: string; // user ID
  uploadedAt: Date;
}

// ─── Payable ──────────────────────────────────────────────────────────────────
// Governance: must be approved by diretor gestor (1st layer) then authorized
// by a DIFFERENT diretor autorizador (2nd layer) before payment.

export interface Payable {
  id: string;
  description: string;
  supplierName: string;
  supplierCnpj: string | null;
  amount: number;
  dueAt: Date;
  status: PayableStatus;
  categoryId: string;
  costCenterId: string | null;
  /** References projetos.projects.id when auto-created by project approval */
  projectId: string | null;
  batchApprovalId: string | null;
  attachments: Attachment[];
  /** Diretor gestor user ID (1st approval layer) */
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  /** Diretor autorizador user ID (2nd layer) — must differ from approvedBy */
  authorizedBy: string | null;
  authorizedByName: string | null;
  authorizedAt: Date | null;
  paidAt: Date | null;
  paidByTransactionId: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  notes: string | null;
  createdBy: string; // user ID
  createdAt: Date;
  updatedAt: Date;
}

// ─── ReceivableStatus ─────────────────────────────────────────────────────────

export type ReceivableStatus =
  | "pendente"
  | "recebido"
  | "atrasado"
  | "cancelado";

// ─── Receivable ───────────────────────────────────────────────────────────────

export interface Receivable {
  id: string;
  description: string;
  payerName: string;
  payerCnpj: string | null;
  amount: number;
  expectedAt: Date;
  receivedAt: Date | null;
  status: ReceivableStatus;
  categoryId: string;
  costCenterId: string | null;
  bankAccountId: string | null;
  /** Set when reconciled with an imported bank transaction */
  transactionId: string | null;
  notes: string | null;
  createdBy: string; // user ID
  createdAt: Date;
  updatedAt: Date;
}

// ─── Transaction ──────────────────────────────────────────────────────────────
// IMMUTABLE — no updates allowed. Corrections via TransactionReversal only.
// No updatedAt field by design.

export interface Transaction {
  readonly id: string;
  readonly bankAccountId: string;
  readonly type: TransactionType;
  readonly amount: number;
  readonly description: string;
  readonly occurredAt: Date;
  readonly categoryId: string | null;
  readonly costCenterId: string | null;
  /** Set when this transaction settles a payable */
  readonly payableId: string | null;
  /** Set when this transaction settles a receivable */
  readonly receivableId: string | null;
  /** Set when imported via OFX/CSV */
  readonly bankImportId: string | null;
  /** External reference from bank (OFX fitId or CSV column) */
  readonly externalRef: string | null;
  readonly reconciledAt: Date | null;
  readonly reconciledBy: string | null;
  /** ID of the Transaction this one reverses, if applicable */
  readonly reversalOf: string | null;
  /** True when a TransactionReversal record points to this transaction */
  readonly isReversed: boolean;
  readonly notes: string | null;
  readonly createdBy: string; // user ID
  readonly createdAt: Date;
}

// ─── TransactionReversal ──────────────────────────────────────────────────────
// Creates an audit trail: original → reversal transaction + new corrected entry.

export interface TransactionReversal {
  id: string;
  originalTransactionId: string;
  /** The new debit/credit that cancels the original */
  reversalTransactionId: string;
  reason: string;
  createdBy: string; // user ID
  createdAt: Date;
}

// ─── BudgetItem ───────────────────────────────────────────────────────────────

export interface BudgetItem {
  id: string;
  budgetId: string;
  categoryId: string;
  categoryName: string;
  description: string;
  plannedAmount: number;
  /** 1–12; null means the item covers the full year without monthly breakdown */
  month: number | null;
  notes: string | null;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

// isActive/approvedBy/approvedAt removidos em P-3.6b: nenhuma action, prompt
// ou critério do repositório define aprovação de orçamento — os três campos
// só existiam como literal fixo em getBudgets (S-214, achado 1). Reintroduzir
// exige um fluxo de aprovação real (schema + action + tela), não só o tipo.
export interface Budget {
  id: string;
  name: string;
  year: number;
  /** If linked to a project cost center */
  projectId: string | null;
  costCenterId: string | null;
  totalAmount: number;
  items: BudgetItem[];
  createdBy: string; // user ID
  createdAt: Date;
  updatedAt: Date;
}

// ─── BankImportStatus ─────────────────────────────────────────────────────────

export type BankImportStatus =
  | "pendente"
  | "processando"
  | "concluido"
  | "com_erros";

// ─── BankImportItemMatchStatus ────────────────────────────────────────────────

export type BankImportItemMatchStatus =
  | "pendente"
  | "vinculado"
  | "ignorado"
  | "novo";

// ─── BankImportItem ───────────────────────────────────────────────────────────

export interface BankImportItem {
  id: string;
  bankImportId: string;
  externalRef: string | null;
  occurredAt: Date;
  description: string;
  amount: number;
  type: TransactionType;
  matchStatus: BankImportItemMatchStatus;
  /** automatico = matched by value+date+description algorithm; manual = user matched */
  matchType: "automatico" | "manual" | null;
  transactionId: string | null;
  suggestedPayableId: string | null;
  suggestedReceivableId: string | null;
}

// ─── BankImport ───────────────────────────────────────────────────────────────
// OFX or CSV import batch. Triggers automatic matching by value + date + description.

export interface BankImport {
  id: string;
  bankAccountId: string;
  format: "ofx" | "csv";
  fileName: string;
  status: BankImportStatus;
  totalItems: number;
  matchedItems: number;
  ignoredItems: number;
  pendingItems: number;
  importedBy: string; // user ID
  importedAt: Date;
  processedAt: Date | null;
  items: BankImportItem[];
}

// ─── BatchApprovalStatus ──────────────────────────────────────────────────────

export type BatchApprovalStatus =
  | "pendente"
  | "aprovado"
  | "parcialmente_aprovado"
  | "cancelado";

// ─── BatchApproval ────────────────────────────────────────────────────────────
// System groups payables weekly. Email to diretor gestor triggers 1st approval,
// then diretor autorizador (different person) provides 2nd layer authorization.

export interface BatchApproval {
  id: string;
  /** ISO week start (Monday 00:00) */
  weekStart: Date;
  /** ISO week end (Sunday 23:59) */
  weekEnd: Date;
  payables: Payable[];
  totalAmount: number;
  status: BatchApprovalStatus;
  /** Timestamp when approval-request email was dispatched */
  approvalRequestSentAt: Date | null;
  /** Diretor gestor user ID */
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  /** Timestamp when authorization-request notification was dispatched */
  authorizationRequestSentAt: Date | null;
  /** Diretor autorizador user ID — must differ from approvedBy */
  authorizedBy: string | null;
  authorizedByName: string | null;
  authorizedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Compact views for lists/tables ──────────────────────────────────────────

export interface CompactPayableView {
  id: string;
  description: string;
  supplierName: string;
  amount: number;
  dueAt: Date;
  status: PayableStatus;
  categoryName: string;
  costCenterName: string | null;
  batchApprovalId: string | null;
  createdAt: Date;
}

export interface CompactTransactionView {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  occurredAt: Date;
  bankAccountName: string;
  categoryName: string | null;
  isReversed: boolean;
  reversalOf: string | null;
}
