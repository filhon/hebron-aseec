export type * from "./admin";

// documentos: Tag omitido (colide com tarefas.Tag, forma diferente) — acesse via
// @hebron/types/documentos. Decisão de contrato registrada em SESSIONS.md.
export type {
  DocumentVisibility,
  DocumentType,
  DocumentStatus,
  EditalCycleType,
  Category,
  DocumentVersion,
  Document,
  Edital,
  Subscription,
} from "./documentos";

// financeiro: Attachment/AttachmentParentType omitidos (colidem com os
// homônimos de tarefas, formas diferentes) — acesse via @hebron/types/financeiro.
export type {
  TransactionType,
  BankAccountType,
  BankAccount,
  CostCenter,
  AccountCategoryType,
  AccountCategory,
  PayableStatus,
  Payable,
  ReceivableStatus,
  Receivable,
  Transaction,
  TransactionReversal,
  BudgetItem,
  Budget,
  BankImportStatus,
  BankImportItemMatchStatus,
  BankImportItem,
  BankImport,
  BatchApprovalStatus,
  BatchApproval,
  CompactPayableView,
  CompactTransactionView,
} from "./financeiro";

export type * from "./flats";
export type * from "./intranet";

// plataforma: Series omitido (colide com radio.Series, forma diferente) —
// acesse via @hebron/types/plataforma.
export type {
  LessonType,
  Instructor,
  Course,
  CourseModule,
  Lesson,
  Enrollment,
  Progress,
  QuizOption,
  QuizQuestion,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  Certificate,
  Discussion,
  DiscussionPost,
} from "./plataforma";

export type * from "./projetos";

// radio: Series omitido (colide com plataforma.Series, forma diferente) —
// acesse via @hebron/types/radio.
export type {
  Author,
  Track,
  Playlist,
  NowPlaying,
  ExclusiveMaterial,
  TermAcceptance,
} from "./radio";

export type * from "./roles";

// tarefas: Tag/Attachment/AttachmentParentType omitidos (colidem com
// documentos.Tag e financeiro.Attachment/AttachmentParentType, formas
// diferentes) — acesse via @hebron/types/tarefas.
export type {
  Workspace,
  TaskPriority,
  TaskStatus,
  RecurrenceType,
  RecurrenceRule,
  TagColor,
  Assignee,
  Subtask,
  Comment,
  TimeEntry,
  ApprovalRequestStatus,
  ApprovalRequest,
  SubtaskProgress,
  TaskEventType,
  TaskEvent,
  Task,
  TaskTemplateItem,
  TaskTemplateTrigger,
  TaskTemplate,
  CompactTaskView,
} from "./tarefas";
