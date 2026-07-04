// Re-exports public schema primitives (excluding the minimal notifications
// stub — the expanded version lives in notifications.ts, adjacent to this
// file — not to be confused with ../notifications.ts, which is the shared
// insert helper for @hebron/email's createNotification).
export {
  adminSchema,
  projetosSchema,
  plataformaSchema,
  radioSchema,
  financeiroSchema,
  intranetSchema,
  documentosSchema,
  flatsSchema,
  tarefasSchema,
  roleEnum,
  designationTypeEnum,
  userStatusEnum,
  users,
  roleAssignments,
  designations,
} from "./public";

export type {
  User,
  NewUser,
  RoleAssignment,
  NewRoleAssignment,
  Designation,
  NewDesignation,
} from "./public";

// Expanded notifications schema
export { notificationChannelEnum, notifications } from "./notifications";

export type { Notification, NewNotification } from "./notifications";

// Admin schema
export {
  auditActionEnum,
  meetingTypeEnum,
  meetingStatusEnum,
  auditLog,
  invitations,
  emailTemplates,
  meetingSessions,
  featureFlags,
  systemSettings,
} from "./admin";

export type {
  AuditLog,
  NewAuditLog,
  Invitation,
  NewInvitation,
  EmailTemplate,
  NewEmailTemplate,
  MeetingSession,
  NewMeetingSession,
  FeatureFlag,
  NewFeatureFlag,
  SystemSetting,
  NewSystemSetting,
} from "./admin";

// Documentos schema
export {
  visibilityEnum,
  categories,
  tags,
  documents,
  documentTags,
  documentVersions,
  editals,
  subscriptions,
  views,
} from "./documentos";

export type {
  Category,
  NewCategory,
  Tag,
  NewTag,
  Document,
  NewDocument,
  DocumentTag,
  NewDocumentTag,
  DocumentVersion,
  NewDocumentVersion,
  Edital,
  NewEdital,
  Subscription,
  NewSubscription,
  View,
  NewView,
} from "./documentos";

// Projetos schema
// Financeiro schema (módulo completo — P-3.6)
export {
  accountTypeEnum,
  financialCategoryTypeEnum,
  payableStatusEnum,
  receivableStatusEnum,
  receivableSourceEnum,
  transactionTypeEnum,
  importFormatEnum,
  importRowStatusEnum,
  attachmentRefTypeEnum,
  bankAccounts,
  financialCategories,
  costCenters,
  budgets,
  budgetItems,
  payables,
  receivables,
  transactions,
  transactionReversals,
  financialAttachments,
  bankImports,
  bankImportRows,
  batchApprovals,
  batchApprovalItems,
} from "./financeiro";

export type {
  BankAccount,
  NewBankAccount,
  FinancialCategory,
  NewFinancialCategory,
  CostCenter,
  NewCostCenter,
  Budget,
  NewBudget,
  BudgetItem,
  NewBudgetItem,
  Payable,
  NewPayable,
  Receivable,
  NewReceivable,
  Transaction,
  NewTransaction,
  TransactionReversal,
  NewTransactionReversal,
  FinancialAttachment,
  NewFinancialAttachment,
  BankImport,
  NewBankImport,
  BankImportRow,
  NewBankImportRow,
  BatchApproval,
  NewBatchApproval,
  BatchApprovalItem,
  NewBatchApprovalItem,
} from "./financeiro";

export {
  projectTypeEnum,
  projectStageEnum,
  reportStatusEnum,
  paymentStatusEnum,
  contestationStatusEnum,
  evaluationRecommendationEnum,
  PROJECT_STAGES,
  VALID_STAGE_TRANSITIONS,
  projectCategories,
  organizations,
  organizationMembers,
  projects,
  projectVersions,
  compactVersions,
  evaluations,
  votes,
  contestations,
  reports,
  reportAttachments,
  projectAttachments,
  paymentSchedules,
} from "./projetos";

export type {
  ProjectStage,
  ProjectCategory,
  NewProjectCategory,
  Organization,
  NewOrganization,
  OrganizationMember,
  NewOrganizationMember,
  Project,
  NewProject,
  ProjectVersion,
  NewProjectVersion,
  CompactVersion,
  NewCompactVersion,
  Evaluation,
  NewEvaluation,
  Vote,
  NewVote,
  Contestation,
  NewContestation,
  Report,
  NewReport,
  ReportAttachment,
  NewReportAttachment,
  ProjectAttachment,
  NewProjectAttachment,
  PaymentSchedule,
  NewPaymentSchedule,
} from "./projetos";
