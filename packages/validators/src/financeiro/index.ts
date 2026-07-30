import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

const positiveAmount = z
  .number({ invalid_type_error: "Valor deve ser um número" })
  .positive("Valor deve ser maior que zero")
  .multipleOf(0.01, "Valor pode ter no máximo 2 casas decimais");

const cnpj = z
  .string()
  .regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos numéricos")
  .nullable();

const payableStatusEnum = z.enum([
  "pendente",
  "aprovado",
  "autorizado",
  "pago",
  "cancelado",
]);

const receivableStatusEnum = z.enum([
  "pendente",
  "recebido",
  "atrasado",
  "cancelado",
]);

const transactionTypeEnum = z.enum(["credito", "debito"]);

// ─── attachmentInputSchema ────────────────────────────────────────────────────
// Comprovante já enviado ao bucket financeiro-recibos pelo formulário antes do
// submit; a action só grava a referência (path retornado pelo Storage).

const attachmentInputSchema = z.object({
  path: z.string().min(1, "Caminho do arquivo inválido"),
  fileName: z.string().min(1, "Nome do arquivo inválido").max(255),
  fileSize: z.number().int().positive().nullable().optional().default(null),
});

export type AttachmentInput = z.infer<typeof attachmentInputSchema>;

// ─── createPayableSchema ──────────────────────────────────────────────────────
// Validates the creation of a new payable. Governance fields (approvedBy,
// authorizedBy) are set by separate action handlers, never on creation.

export const createPayableSchema = z.object({
  description: z
    .string()
    .min(5, "Descrição deve ter pelo menos 5 caracteres")
    .max(500, "Descrição deve ter no máximo 500 caracteres"),
  supplierName: z.string().min(2, "Nome do fornecedor é obrigatório").max(200),
  supplierCnpj: cnpj.optional().default(null),
  amount: positiveAmount,
  dueAt: z.coerce.date({ invalid_type_error: "Data de vencimento inválida" }),
  categoryId: z.string().uuid("Selecione uma categoria válida"),
  costCenterId: z
    .string()
    .uuid("Selecione um centro de custo válido")
    .nullable()
    .optional()
    .default(null),
  projectId: z
    .string()
    .uuid("Projeto inválido")
    .nullable()
    .optional()
    .default(null),
  notes: z
    .string()
    .max(1000, "Observações devem ter no máximo 1000 caracteres")
    .nullable()
    .optional()
    .default(null),
  attachment: attachmentInputSchema.nullable().optional().default(null),
});

export type CreatePayableInput = z.infer<typeof createPayableSchema>;

// ─── approvePayableSchema ─────────────────────────────────────────────────────
// Used by the diretor gestor action (1st approval layer).

export const approvePayableSchema = z.object({
  payableId: z.string().uuid(),
  notes: z.string().max(500).nullable().optional().default(null),
});

export type ApprovePayableInput = z.infer<typeof approvePayableSchema>;

// ─── authorizePayableSchema ───────────────────────────────────────────────────
// Used by the diretor autorizador action (2nd layer).
// Guard: authorizedBy must differ from approvedBy — enforced in the action handler.

export const authorizePayableSchema = z.object({
  payableId: z.string().uuid(),
  notes: z.string().max(500).nullable().optional().default(null),
});

export type AuthorizePayableInput = z.infer<typeof authorizePayableSchema>;

// ─── cancelPayableSchema ──────────────────────────────────────────────────────

export const cancelPayableSchema = z.object({
  payableId: z.string().uuid(),
  reason: z
    .string()
    .min(10, "Informe o motivo do cancelamento (mínimo 10 caracteres)")
    .max(500),
});

export type CancelPayableInput = z.infer<typeof cancelPayableSchema>;

// ─── createReceivableSchema ───────────────────────────────────────────────────

export const createReceivableSchema = z.object({
  description: z
    .string()
    .min(5, "Descrição deve ter pelo menos 5 caracteres")
    .max(500),
  payerName: z.string().min(2, "Nome do pagador é obrigatório").max(200),
  payerCnpj: cnpj.optional().default(null),
  amount: positiveAmount,
  expectedAt: z.coerce.date({
    invalid_type_error: "Data de previsão inválida",
  }),
  categoryId: z.string().uuid("Selecione uma categoria válida"),
  costCenterId: z.string().uuid().nullable().optional().default(null),
  bankAccountId: z
    .string()
    .uuid("Selecione uma conta bancária")
    .nullable()
    .optional()
    .default(null),
  notes: z.string().max(1000).nullable().optional().default(null),
  attachment: attachmentInputSchema.nullable().optional().default(null),
});

export type CreateReceivableInput = z.infer<typeof createReceivableSchema>;

// ─── createTransactionSchema ──────────────────────────────────────────────────
// Manual transaction entry. Imported transactions are created via BankImport flow.
// Immutability enforced at DB layer — no update schema is exported.

export const createTransactionSchema = z.object({
  bankAccountId: z.string().uuid("Selecione uma conta bancária válida"),
  type: transactionTypeEnum,
  amount: positiveAmount,
  description: z
    .string()
    .min(3, "Descrição deve ter pelo menos 3 caracteres")
    .max(500),
  occurredAt: z.coerce.date({
    invalid_type_error: "Data da transação inválida",
  }),
  categoryId: z
    .string()
    .uuid("Selecione uma categoria")
    .nullable()
    .optional()
    .default(null),
  costCenterId: z.string().uuid().nullable().optional().default(null),
  payableId: z.string().uuid().nullable().optional().default(null),
  receivableId: z.string().uuid().nullable().optional().default(null),
  externalRef: z.string().max(100).nullable().optional().default(null),
  notes: z.string().max(1000).nullable().optional().default(null),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// ─── createReversalSchema ─────────────────────────────────────────────────────
// Reverses an immutable transaction. Handler creates two records:
// (1) a reversal transaction + (2) a TransactionReversal audit entry.

export const createReversalSchema = z.object({
  originalTransactionId: z.string().uuid("Transação original inválida"),
  reason: z
    .string()
    .min(10, "Informe o motivo do estorno (mínimo 10 caracteres)")
    .max(500),
});

export type CreateReversalInput = z.infer<typeof createReversalSchema>;

// ─── createBankAccountSchema ──────────────────────────────────────────────────

export const createBankAccountSchema = z.object({
  name: z.string().min(3, "Nome da conta é obrigatório").max(100),
  bank: z.string().min(2, "Informe o banco").max(100),
  agency: z.string().min(1, "Informe a agência").max(20),
  accountNumber: z.string().min(1, "Informe o número da conta").max(30),
  type: z.enum(["corrente", "poupanca", "investimento"]),
  initialBalance: z
    .number({ invalid_type_error: "Saldo inicial deve ser um número" })
    .multipleOf(0.01, "Saldo inicial pode ter no máximo 2 casas decimais"),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

// ─── createAccountCategorySchema ─────────────────────────────────────────────

export const createAccountCategorySchema = z.object({
  code: z
    .string()
    .regex(/^\d+(\.\d+){0,2}$/, "Código inválido (ex: 1, 1.1, 1.1.1)")
    .max(20),
  name: z.string().min(3, "Nome da categoria é obrigatório").max(200),
  type: z.enum(["receita", "despesa"]),
  parentId: z.string().uuid().nullable().optional().default(null),
});

export type CreateAccountCategoryInput = z.infer<
  typeof createAccountCategorySchema
>;

// ─── createBudgetSchema ───────────────────────────────────────────────────────

export const createBudgetItemSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria"),
  description: z.string().min(3).max(300),
  plannedAmount: positiveAmount,
  month: z.number().int().min(1).max(12).nullable().optional().default(null),
  notes: z.string().max(500).nullable().optional().default(null),
});

export const createBudgetSchema = z.object({
  name: z.string().min(3, "Nome do orçamento é obrigatório").max(200),
  year: z.number().int().min(2020, "Ano inválido").max(2100, "Ano inválido"),
  projectId: z.string().uuid().nullable().optional().default(null),
  costCenterId: z.string().uuid().nullable().optional().default(null),
  items: z
    .array(createBudgetItemSchema)
    .min(1, "Adicione pelo menos um item ao orçamento"),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

// ─── organizationBudgetSchema ─────────────────────────────────────────────────
// Teto de orçamento por instituição/ano (S1-01) — checkOrganizationBudget
// (apps/projetos) consulta financeiro.organization_budgets com esses campos.

export const createOrganizationBudgetSchema = z.object({
  organizationId: z.string().uuid("Selecione uma instituição"),
  year: z.number().int().min(2020, "Ano inválido").max(2100, "Ano inválido"),
  amount: positiveAmount,
});

export type CreateOrganizationBudgetInput = z.infer<
  typeof createOrganizationBudgetSchema
>;

export const updateOrganizationBudgetSchema = z.object({
  organizationBudgetId: z.string().uuid("Orçamento inválido"),
  amount: positiveAmount,
});

export type UpdateOrganizationBudgetInput = z.infer<
  typeof updateOrganizationBudgetSchema
>;

// ─── bankImportSchema ─────────────────────────────────────────────────────────

export const bankImportSchema = z.object({
  bankAccountId: z.string().uuid("Selecione uma conta bancária"),
  format: z.enum(["ofx", "csv"]),
  fileName: z.string().min(1).max(255),
});

export type BankImportInput = z.infer<typeof bankImportSchema>;

// ─── reconcileItemSchema ──────────────────────────────────────────────────────
// Manual reconciliation: link an import item to an existing payable/receivable.

export const reconcileItemSchema = z.object({
  bankImportItemId: z.string().uuid(),
  action: z.enum([
    "vincular_payable",
    "vincular_receivable",
    "ignorar",
    "criar_novo",
  ]),
  payableId: z.string().uuid().nullable().optional().default(null),
  receivableId: z.string().uuid().nullable().optional().default(null),
});

export type ReconcileItemInput = z.infer<typeof reconcileItemSchema>;

// ─── Re-export status enums for shared use ───────────────────────────────────

export { payableStatusEnum, receivableStatusEnum, transactionTypeEnum };
