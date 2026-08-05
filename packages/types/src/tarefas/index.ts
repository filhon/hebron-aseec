// ─── Workspace ────────────────────────────────────────────────────────────────
// 6 workspaces fixos (BRAIN §6.9) — não customizáveis, não expansíveis (PATCH:
// rejeitado em BRAIN §"Fora de escopo" por contradizer "workspaces fixos").

export type Workspace =
  | "administrativo"
  | "financeiro"
  | "contabil_fiscal"
  | "eclesiastico"
  | "comunicacao"
  | "tecnologia_inovacao";

// ─── TaskPriority ─────────────────────────────────────────────────────────────

export type TaskPriority = "baixa" | "media" | "alta" | "urgente";

// ─── TaskStatus ───────────────────────────────────────────────────────────────
// 4 status fixos (BRAIN §6.9) — colunas do Kanban não são customizáveis.

export type TaskStatus =
  | "a_fazer"
  | "em_progresso"
  | "em_revisao"
  | "concluido";

// ─── RecurrenceType ───────────────────────────────────────────────────────────

export type RecurrenceType = "diaria" | "semanal" | "mensal" | "anual";

// ─── RecurrenceRule ───────────────────────────────────────────────────────────
// dayOfWeek usado só quando type = "semanal" (0 = domingo .. 6 = sábado).
// dayOfMonth usado só quando type = "mensal" | "anual" (1-31).
// month usado só quando type = "anual" (1-12) — P-4.1b: sem este campo, uma
// regra anual (ex: IPTU) não sabe em que mês cair, só em que dia.

export interface RecurrenceRule {
  type: RecurrenceType;
  /** A cada N ocorrências do tipo (ex: intervalo 2 + semanal = quinzenal) */
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  month: number | null;
  /** Null = recorrência sem prazo final */
  endDate: Date | null;
}

// ─── TagColor ─────────────────────────────────────────────────────────────────
// Nomes semânticos do design system (BRAIN §5) — nunca hex direto.

export type TagColor = "blue" | "orange" | "green" | "cyan" | "neutral";

// ─── Tag ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  color: TagColor;
}

// ─── Assignee ─────────────────────────────────────────────────────────────────

export interface Assignee {
  userId: string;
  userName: string;
  assignedAt: Date;
}

// ─── Subtask ──────────────────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  assigneeId: string | null;
  assigneeName: string | null;
  order: number;
  createdAt: Date;
  completedAt: Date | null;
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  content: string;
  /** User IDs @mencionados no conteúdo */
  mentions: string[];
  createdAt: Date;
  updatedAt: Date | null;
}

// ─── Attachment ───────────────────────────────────────────────────────────────

export type AttachmentParentType = "task" | "comment";

export interface Attachment {
  id: string;
  parentType: AttachmentParentType;
  parentId: string;
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Date;
}

// ─── TimeEntry ────────────────────────────────────────────────────────────────
// Time tracking é opcional (BRAIN §6.9, "features v1"). O tipo existe para dar
// suporte à opção quando ativada por tarefa; não há UI obrigatória de pomodoro.

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  startedAt: Date;
  /** Null = cronômetro em andamento */
  endedAt: Date | null;
  durationMinutes: number | null;
  notes: string | null;
}

// ─── ApprovalRequest ──────────────────────────────────────────────────────────
// Diretores não recebem tarefas operacionais — recebem pedidos de aprovação
// para avançar o status de uma tarefa (BRAIN §6.9).

export type ApprovalRequestStatus = "pendente" | "aprovado" | "rejeitado";

export interface ApprovalRequest {
  id: string;
  taskId: string;
  /** Status que a tarefa avança para, caso aprovado */
  requestedStatus: TaskStatus;
  requestedBy: string;
  requestedByName: string;
  /** Diretor responsável pela aprovação */
  approverId: string;
  approverName: string;
  status: ApprovalRequestStatus;
  notes: string | null;
  requestedAt: Date;
  resolvedAt: Date | null;
}

// ─── SubtaskProgress ──────────────────────────────────────────────────────────

export interface SubtaskProgress {
  done: number;
  total: number;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string | null;
  workspace: Workspace;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  assignees: Assignee[];
  tags: Tag[];
  subtasks: Subtask[];
  /** Derivado de subtasks — null quando a tarefa não tem subtarefas */
  subtaskProgress: SubtaskProgress | null;
  comments: Comment[];
  attachments: Attachment[];
  timeEntries: TimeEntry[];
  recurrenceRule: RecurrenceRule | null;
  /** Tarefa que originou esta instância, quando gerada por recorrência */
  recurrenceParentId: string | null;
  /** Módulo de origem quando a tarefa nasce automática (ex: "flats", "projetos", "intranet") */
  sourceModule: string | null;
  /** ID do registro que originou a tarefa automática no módulo de origem */
  sourceId: string | null;
  /** Tarefas automáticas nascem sem responsável — super_admin atribui manualmente (BRAIN §6.9) */
  needsManualAssignment: boolean;
  approvalRequest: ApprovalRequest | null;
  /** Pedidos anteriores da mesma tarefa, mais recente primeiro — sempre
   * resolvidos (aprovado/rejeitado); o corrente nunca aparece aqui (P-4.8c) */
  approvalHistory: ApprovalRequest[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  deletedAt: Date | null;
}

// ─── TaskTemplateItem ─────────────────────────────────────────────────────────

export interface TaskTemplateItem {
  title: string;
  description: string | null;
  priority: TaskPriority;
  /** Dias após o disparo do template em que esta tarefa pré-definida vence */
  dueOffsetDays: number | null;
  /** Títulos das subtarefas pré-definidas */
  subtasks: string[];
}

// ─── TaskTemplateTrigger ──────────────────────────────────────────────────────

export interface TaskTemplateTrigger {
  /** Módulo que dispara o evento (ex: "flats", "projetos", "intranet") */
  sourceModule: string;
  /** Nome do evento (ex: "reserva_confirmada") */
  event: string;
}

// ─── TaskTemplate ─────────────────────────────────────────────────────────────

export interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  workspace: Workspace;
  tasks: TaskTemplateItem[];
  /** Null = disparado manualmente por um colaborador; definido = evento cross-module */
  trigger: TaskTemplateTrigger | null;
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── CompactTaskView ──────────────────────────────────────────────────────────
// Forma mínima para listas/Kanban/árvore — evita carregar objetos aninhados.

export interface CompactTaskView {
  id: string;
  title: string;
  workspace: Workspace;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  assigneeNames: string[];
  tagNames: string[];
  subtaskProgress: SubtaskProgress | null;
  hasApprovalPending: boolean;
  createdAt: Date;
}
