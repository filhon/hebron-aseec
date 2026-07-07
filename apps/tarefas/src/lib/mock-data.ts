import type {
  ApprovalRequest,
  Assignee,
  Attachment,
  Comment,
  RecurrenceRule,
  Subtask,
  Tag,
  Task,
  TaskTemplate,
  TimeEntry,
  Workspace,
} from "@hebron/types/tarefas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const d = (offsetDays: number): Date => {
  const dt = new Date("2026-07-01T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt;
};

const past = (daysAgo: number) => d(-daysAgo);
const future = (daysAhead: number) => d(daysAhead);

// ─── Colaboradores (assignees/criadores) ─────────────────────────────────────

const colaboradores = {
  marina: { id: "user-colab-01", name: "Marina Alves" },
  thiago: { id: "user-colab-02", name: "Thiago Nunes" },
  patricia: { id: "user-colab-03", name: "Patrícia Gomes" },
  rafael: { id: "user-colab-04", name: "Rafael Duarte" },
  juliana: { id: "user-colab-05", name: "Juliana Prado" },
  vinicius: { id: "user-colab-06", name: "Vinícius Teixeira" },
  camila: { id: "user-colab-07", name: "Camila Rezende" },
  eduardo: { id: "user-colab-08", name: "Eduardo Lins" },
};

// Diretores só aparecem como aprovadores (BRAIN §6.9 — nunca como responsáveis
// operacionais). Nomes reaproveitados de apps/financeiro/apps/projetos.
const diretores = {
  fabio: { id: "user-diretor-01", name: "Dir. Fábio Ribeiro" },
  anaPaula: { id: "user-diretor-02", name: "Dir. Ana Paula Souza" },
};

const assignee = (
  who: { id: string; name: string },
  daysAgo: number,
): Assignee => ({
  userId: who.id,
  userName: who.name,
  assignedAt: past(daysAgo),
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const mockTags: Tag[] = [
  { id: "tag-01", name: "Urgente Cliente", color: "orange" },
  { id: "tag-02", name: "Reunião", color: "blue" },
  { id: "tag-03", name: "Financeiro Mensal", color: "green" },
  { id: "tag-04", name: "Bug", color: "orange" },
  { id: "tag-05", name: "Documentação", color: "cyan" },
  { id: "tag-06", name: "Compliance", color: "neutral" },
];

function tag(id: string): Tag {
  const found = mockTags.find((t) => t.id === id);
  if (!found) throw new Error(`Tag desconhecida: ${id}`);
  return found;
}

// ─── Task factory ─────────────────────────────────────────────────────────────
// Constrói uma tarefa com valores padrão simples; usado pelas tarefas "regulares"
// abaixo. Cenários ricos (subtarefas, comentários, anexos, aprovação, recorrência,
// automação) sobrescrevem os campos relevantes explicitamente.

interface TaskOverrides {
  id: string;
  title: string;
  workspace: Workspace;
  priority: Task["priority"];
  status: Task["status"];
  createdBy: { id: string; name: string };
  createdDaysAgo: number;
  dueInDays?: number | null;
  assignees?: Assignee[];
  tags?: Tag[];
  subtasks?: Subtask[];
  comments?: Comment[];
  attachments?: Attachment[];
  timeEntries?: TimeEntry[];
  recurrenceRule?: RecurrenceRule | null;
  recurrenceParentId?: string | null;
  sourceModule?: string | null;
  sourceId?: string | null;
  needsManualAssignment?: boolean;
  approvalRequest?: ApprovalRequest | null;
  completedDaysAgo?: number | null;
  description?: string | null;
}

function makeTask(o: TaskOverrides): Task {
  const subtasks = o.subtasks ?? [];
  const subtaskProgress =
    subtasks.length > 0
      ? {
          done: subtasks.filter((s) => s.isDone).length,
          total: subtasks.length,
        }
      : null;

  return {
    id: o.id,
    title: o.title,
    description: o.description ?? null,
    workspace: o.workspace,
    priority: o.priority,
    status: o.status,
    dueDate:
      o.dueInDays === undefined
        ? null
        : o.dueInDays === null
          ? null
          : future(o.dueInDays),
    assignees: o.assignees ?? [],
    tags: o.tags ?? [],
    subtasks,
    subtaskProgress,
    comments: o.comments ?? [],
    attachments: o.attachments ?? [],
    timeEntries: o.timeEntries ?? [],
    recurrenceRule: o.recurrenceRule ?? null,
    recurrenceParentId: o.recurrenceParentId ?? null,
    sourceModule: o.sourceModule ?? null,
    sourceId: o.sourceId ?? null,
    needsManualAssignment: o.needsManualAssignment ?? false,
    approvalRequest: o.approvalRequest ?? null,
    createdBy: o.createdBy.id,
    createdByName: o.createdBy.name,
    createdAt: past(o.createdDaysAgo),
    updatedAt: past(Math.max(o.createdDaysAgo - 1, 0)),
    completedAt: o.completedDaysAgo == null ? null : past(o.completedDaysAgo),
    deletedAt: null,
  };
}

// ─── Recorrências (BRAIN §6.9 — cenários citados explicitamente) ─────────────

const recurEnergia: RecurrenceRule = {
  type: "mensal",
  interval: 1,
  dayOfWeek: null,
  dayOfMonth: 10,
  endDate: null,
};

const recurAgua: RecurrenceRule = {
  type: "mensal",
  interval: 1,
  dayOfWeek: null,
  dayOfMonth: 15,
  endDate: null,
};

const recurIptu: RecurrenceRule = {
  type: "anual",
  interval: 1,
  dayOfWeek: null,
  dayOfMonth: 10,
  endDate: null,
};

const recurLimpezaFlat: RecurrenceRule = {
  type: "semanal",
  interval: 1,
  dayOfWeek: 1, // segunda-feira
  dayOfMonth: null,
  endDate: null,
};

const recurCapelowski: RecurrenceRule = {
  type: "mensal",
  interval: 1,
  dayOfWeek: null,
  dayOfMonth: 1,
  endDate: null,
};

const recurFechamentoContabil: RecurrenceRule = {
  type: "mensal",
  interval: 1,
  dayOfWeek: null,
  dayOfMonth: 5,
  endDate: null,
};

const recurringTasks: Task[] = [
  makeTask({
    id: "task-r01",
    title: "Pagar conta de energia elétrica",
    workspace: "financeiro",
    priority: "alta",
    status: "a_fazer",
    createdBy: colaboradores.vinicius,
    createdDaysAgo: 30,
    dueInDays: 9,
    assignees: [assignee(colaboradores.vinicius, 30)],
    tags: [tag("tag-03")],
    recurrenceRule: recurEnergia,
  }),
  makeTask({
    id: "task-r02",
    title: "Pagar conta de água",
    workspace: "financeiro",
    priority: "alta",
    status: "a_fazer",
    createdBy: colaboradores.vinicius,
    createdDaysAgo: 30,
    dueInDays: 14,
    assignees: [assignee(colaboradores.vinicius, 30)],
    tags: [tag("tag-03")],
    recurrenceRule: recurAgua,
  }),
  makeTask({
    id: "task-r03",
    title: "Pagar IPTU dos imóveis",
    workspace: "contabil_fiscal",
    priority: "media",
    status: "a_fazer",
    createdBy: colaboradores.rafael,
    createdDaysAgo: 60,
    dueInDays: 100,
    assignees: [assignee(colaboradores.rafael, 60)],
    tags: [tag("tag-06")],
    recurrenceRule: recurIptu,
  }),
  makeTask({
    id: "task-r04",
    title: "Checagem de limpeza do flat",
    workspace: "administrativo",
    priority: "media",
    status: "concluido",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 7,
    completedDaysAgo: 1,
    assignees: [assignee(colaboradores.patricia, 7)],
    recurrenceRule: recurLimpezaFlat,
  }),
  makeTask({
    id: "task-r05",
    title: "Enviar convite do Capelowski",
    workspace: "eclesiastico",
    priority: "baixa",
    status: "a_fazer",
    createdBy: colaboradores.juliana,
    createdDaysAgo: 20,
    dueInDays: 30,
    assignees: [assignee(colaboradores.juliana, 20)],
    recurrenceRule: recurCapelowski,
  }),
  makeTask({
    id: "task-r06",
    title: "Fechamento contábil do mês",
    workspace: "contabil_fiscal",
    priority: "alta",
    status: "em_progresso",
    createdBy: colaboradores.rafael,
    createdDaysAgo: 4,
    dueInDays: 4,
    assignees: [assignee(colaboradores.rafael, 4)],
    tags: [tag("tag-06")],
    recurrenceRule: recurFechamentoContabil,
  }),
];

// ─── Tarefas automáticas (nascem sem responsável — super_admin atribui) ──────
// Origem: templates cross-module (ver mockTaskTemplates abaixo).

const autoTasks: Task[] = [
  makeTask({
    id: "task-a01",
    title: "Limpeza pré-estadia — Flat 2B",
    workspace: "administrativo",
    priority: "alta",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 1,
    dueInDays: 2,
    sourceModule: "flats",
    sourceId: "reserva-123",
    needsManualAssignment: true,
  }),
  makeTask({
    id: "task-a02",
    title: "Verificar documentação do projeto — Missão Norte",
    workspace: "administrativo",
    priority: "media",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 2,
    dueInDays: 5,
    sourceModule: "projetos",
    sourceId: "proj-045",
    needsManualAssignment: true,
  }),
  makeTask({
    id: "task-a03",
    title: "Registrar ata da reunião de diretoria",
    workspace: "administrativo",
    priority: "media",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 0,
    dueInDays: 1,
    sourceModule: "intranet",
    sourceId: "reuniao-12",
    needsManualAssignment: true,
  }),
];

// ─── Tarefas com subtarefas, comentários, anexos, time tracking e aprovação ──

const richTasks: Task[] = [
  makeTask({
    id: "task-001",
    title: "Redesenhar identidade visual do boletim mensal",
    description:
      "Atualizar o layout do boletim impresso seguindo a nova identidade visual da Hebron Aseec.",
    workspace: "comunicacao",
    priority: "media",
    status: "em_progresso",
    createdBy: colaboradores.camila,
    createdDaysAgo: 10,
    dueInDays: 5,
    assignees: [
      assignee(colaboradores.camila, 10),
      assignee(colaboradores.marina, 8),
    ],
    tags: [tag("tag-05")],
    subtasks: [
      {
        id: "subtask-001-1",
        taskId: "task-001",
        title: "Levantar referências visuais",
        isDone: true,
        assigneeId: colaboradores.camila.id,
        assigneeName: colaboradores.camila.name,
        order: 1,
        createdAt: past(10),
        completedAt: past(6),
      },
      {
        id: "subtask-001-2",
        taskId: "task-001",
        title: "Diagramar primeira versão",
        isDone: true,
        assigneeId: colaboradores.marina.id,
        assigneeName: colaboradores.marina.name,
        order: 2,
        createdAt: past(10),
        completedAt: past(2),
      },
      {
        id: "subtask-001-3",
        taskId: "task-001",
        title: "Revisão com a diretoria",
        isDone: false,
        assigneeId: colaboradores.camila.id,
        assigneeName: colaboradores.camila.name,
        order: 3,
        createdAt: past(10),
        completedAt: null,
      },
    ],
    comments: [
      {
        id: "comment-001-1",
        taskId: "task-001",
        authorId: colaboradores.marina.id,
        authorName: colaboradores.marina.name,
        content:
          "Já subi a primeira versão diagramada, @Camila Rezende pode revisar?",
        mentions: [colaboradores.camila.id],
        createdAt: past(2),
        updatedAt: null,
      },
    ],
    attachments: [
      {
        id: "attachment-001-1",
        parentType: "task",
        parentId: "task-001",
        storageKey: "tarefas/task-001/boletim-v1.pdf",
        fileName: "boletim-v1.pdf",
        fileSizeBytes: 2_458_112,
        mimeType: "application/pdf",
        uploadedBy: colaboradores.marina.id,
        uploadedByName: colaboradores.marina.name,
        uploadedAt: past(2),
      },
    ],
    timeEntries: [
      {
        id: "time-001-1",
        taskId: "task-001",
        userId: colaboradores.marina.id,
        userName: colaboradores.marina.name,
        startedAt: past(3),
        endedAt: past(3),
        durationMinutes: 180,
        notes: "Diagramação da primeira versão",
      },
    ],
  }),
  makeTask({
    id: "task-002",
    title: "Migrar backup dos servidores para o novo storage",
    workspace: "tecnologia_inovacao",
    priority: "urgente",
    status: "em_revisao",
    createdBy: colaboradores.thiago,
    createdDaysAgo: 6,
    dueInDays: 1,
    assignees: [
      assignee(colaboradores.thiago, 6),
      assignee(colaboradores.eduardo, 6),
    ],
    tags: [tag("tag-04")],
    subtasks: [
      {
        id: "subtask-002-1",
        taskId: "task-002",
        title: "Provisionar novo storage",
        isDone: true,
        assigneeId: colaboradores.eduardo.id,
        assigneeName: colaboradores.eduardo.name,
        order: 1,
        createdAt: past(6),
        completedAt: past(4),
      },
      {
        id: "subtask-002-2",
        taskId: "task-002",
        title: "Migrar dados e validar integridade",
        isDone: false,
        assigneeId: colaboradores.thiago.id,
        assigneeName: colaboradores.thiago.name,
        order: 2,
        createdAt: past(6),
        completedAt: null,
      },
    ],
    approvalRequest: {
      id: "approval-002",
      taskId: "task-002",
      requestedStatus: "concluido",
      requestedBy: colaboradores.thiago.id,
      requestedByName: colaboradores.thiago.name,
      approverId: diretores.fabio.id,
      approverName: diretores.fabio.name,
      status: "pendente",
      notes: "Migração concluída, aguardando aprovação para encerrar a tarefa.",
      requestedAt: past(1),
      resolvedAt: null,
    },
  }),
  makeTask({
    id: "task-003",
    title: "Auditoria de acessos do sistema legado",
    workspace: "tecnologia_inovacao",
    priority: "alta",
    status: "concluido",
    createdBy: colaboradores.eduardo,
    createdDaysAgo: 15,
    completedDaysAgo: 3,
    assignees: [assignee(colaboradores.eduardo, 15)],
    tags: [tag("tag-06")],
    approvalRequest: {
      id: "approval-003",
      taskId: "task-003",
      requestedStatus: "concluido",
      requestedBy: colaboradores.eduardo.id,
      requestedByName: colaboradores.eduardo.name,
      approverId: diretores.anaPaula.id,
      approverName: diretores.anaPaula.name,
      status: "aprovado",
      notes: null,
      requestedAt: past(4),
      resolvedAt: past(3),
    },
  }),
];

// ─── Tarefas regulares (variação de workspace/prioridade/status) ─────────────

const regularTasks: Task[] = [
  makeTask({
    id: "task-004",
    title: "Atualizar cadastro de fornecedores",
    workspace: "administrativo",
    priority: "baixa",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 3,
    dueInDays: 10,
    assignees: [assignee(colaboradores.patricia, 3)],
  }),
  makeTask({
    id: "task-005",
    title: "Organizar arquivo físico de contratos",
    workspace: "administrativo",
    priority: "baixa",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 5,
    dueInDays: 20,
  }),
  makeTask({
    id: "task-006",
    title: "Renovar apólice de seguro predial",
    workspace: "administrativo",
    priority: "media",
    status: "em_progresso",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 12,
    dueInDays: 7,
    assignees: [assignee(colaboradores.patricia, 12)],
    tags: [tag("tag-06")],
  }),
  makeTask({
    id: "task-007",
    title: "Reconciliar extratos bancários da semana",
    workspace: "financeiro",
    priority: "alta",
    status: "a_fazer",
    createdBy: colaboradores.vinicius,
    createdDaysAgo: 2,
    dueInDays: 2,
    assignees: [assignee(colaboradores.vinicius, 2)],
    tags: [tag("tag-03")],
  }),
  makeTask({
    id: "task-008",
    title: "Preparar relatório de fluxo de caixa mensal",
    workspace: "financeiro",
    priority: "media",
    status: "em_revisao",
    createdBy: colaboradores.vinicius,
    createdDaysAgo: 8,
    dueInDays: 3,
    assignees: [assignee(colaboradores.vinicius, 8)],
    tags: [tag("tag-03")],
  }),
  makeTask({
    id: "task-009",
    title: "Revisar planilha de doações recorrentes",
    workspace: "financeiro",
    priority: "baixa",
    status: "concluido",
    createdBy: colaboradores.vinicius,
    createdDaysAgo: 9,
    completedDaysAgo: 2,
    assignees: [assignee(colaboradores.vinicius, 9)],
  }),
  makeTask({
    id: "task-010",
    title: "Conferir notas fiscais de despesas do trimestre",
    workspace: "contabil_fiscal",
    priority: "alta",
    status: "em_progresso",
    createdBy: colaboradores.rafael,
    createdDaysAgo: 6,
    dueInDays: 4,
    assignees: [assignee(colaboradores.rafael, 6)],
  }),
  makeTask({
    id: "task-011",
    title: "Enviar declaração acessória ao Fisco",
    workspace: "contabil_fiscal",
    priority: "urgente",
    status: "a_fazer",
    createdBy: colaboradores.rafael,
    createdDaysAgo: 1,
    dueInDays: 6,
    assignees: [assignee(colaboradores.rafael, 1)],
    tags: [tag("tag-06")],
  }),
  makeTask({
    id: "task-012",
    title: "Atualizar plano de contas com nova categoria",
    workspace: "contabil_fiscal",
    priority: "baixa",
    status: "concluido",
    createdBy: colaboradores.rafael,
    createdDaysAgo: 20,
    completedDaysAgo: 14,
  }),
  makeTask({
    id: "task-013",
    title: "Organizar escala de pregadores do próximo trimestre",
    workspace: "eclesiastico",
    priority: "media",
    status: "a_fazer",
    createdBy: colaboradores.juliana,
    createdDaysAgo: 4,
    dueInDays: 15,
    assignees: [assignee(colaboradores.juliana, 4)],
  }),
  makeTask({
    id: "task-014",
    title: "Revisar liturgia do culto de aniversário da instituição",
    workspace: "eclesiastico",
    priority: "media",
    status: "em_progresso",
    createdBy: colaboradores.juliana,
    createdDaysAgo: 7,
    dueInDays: 9,
    assignees: [assignee(colaboradores.juliana, 7)],
    tags: [tag("tag-02")],
  }),
  makeTask({
    id: "task-015",
    title: "Atualizar lista de instituições parceiras",
    workspace: "eclesiastico",
    priority: "baixa",
    status: "a_fazer",
    createdBy: colaboradores.juliana,
    createdDaysAgo: 3,
    dueInDays: 25,
  }),
  makeTask({
    id: "task-016",
    title: "Planejar pauta da reunião de diretoria",
    workspace: "administrativo",
    priority: "alta",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 2,
    dueInDays: 3,
    assignees: [assignee(colaboradores.patricia, 2)],
    tags: [tag("tag-02")],
  }),
  makeTask({
    id: "task-017",
    title: "Publicar posts da campanha de fim de ano",
    workspace: "comunicacao",
    priority: "media",
    status: "a_fazer",
    createdBy: colaboradores.camila,
    createdDaysAgo: 1,
    dueInDays: 12,
    assignees: [assignee(colaboradores.camila, 1)],
  }),
  makeTask({
    id: "task-018",
    title: "Editar vídeo institucional para o site",
    workspace: "comunicacao",
    priority: "media",
    status: "em_progresso",
    createdBy: colaboradores.marina,
    createdDaysAgo: 9,
    dueInDays: 6,
    assignees: [assignee(colaboradores.marina, 9)],
  }),
  makeTask({
    id: "task-019",
    title: "Atualizar textos do site institucional",
    workspace: "comunicacao",
    priority: "baixa",
    status: "concluido",
    createdBy: colaboradores.camila,
    createdDaysAgo: 18,
    completedDaysAgo: 10,
  }),
  makeTask({
    id: "task-020",
    title: "Corrigir falha de login no app Intranet",
    workspace: "tecnologia_inovacao",
    priority: "urgente",
    status: "em_progresso",
    createdBy: colaboradores.thiago,
    createdDaysAgo: 1,
    dueInDays: 1,
    assignees: [assignee(colaboradores.thiago, 1)],
    tags: [tag("tag-04")],
  }),
  makeTask({
    id: "task-021",
    title: "Configurar monitoramento de uptime dos apps",
    workspace: "tecnologia_inovacao",
    priority: "media",
    status: "a_fazer",
    createdBy: colaboradores.eduardo,
    createdDaysAgo: 4,
    dueInDays: 10,
    assignees: [assignee(colaboradores.eduardo, 4)],
  }),
  makeTask({
    id: "task-022",
    title: "Atualizar dependências do monorepo",
    workspace: "tecnologia_inovacao",
    priority: "baixa",
    status: "a_fazer",
    createdBy: colaboradores.eduardo,
    createdDaysAgo: 2,
    dueInDays: 20,
  }),
  makeTask({
    id: "task-023",
    title: "Revisar contrato com fornecedor de internet",
    workspace: "administrativo",
    priority: "media",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 5,
    dueInDays: 18,
  }),
  makeTask({
    id: "task-024",
    title: "Levantar cotações para reforma do auditório",
    workspace: "administrativo",
    priority: "baixa",
    status: "a_fazer",
    createdBy: colaboradores.patricia,
    createdDaysAgo: 6,
    dueInDays: 30,
  }),
  makeTask({
    id: "task-025",
    title: "Conferir repasses de dízimos e ofertas do mês",
    workspace: "financeiro",
    priority: "alta",
    status: "concluido",
    createdBy: colaboradores.vinicius,
    createdDaysAgo: 10,
    completedDaysAgo: 4,
    assignees: [assignee(colaboradores.vinicius, 10)],
  }),
];

// ─── Templates (3+, com e sem trigger cross-module) ──────────────────────────

export const mockTaskTemplates: TaskTemplate[] = [
  {
    id: "template-01",
    name: "Checklist de Limpeza do Flat",
    description:
      "Gerado automaticamente quando uma reserva de flat é confirmada (BRAIN §6.9).",
    workspace: "administrativo",
    trigger: { sourceModule: "flats", event: "reserva_confirmada" },
    tasks: [
      {
        title: "Limpeza pré-estadia",
        description: null,
        priority: "alta",
        dueOffsetDays: 1,
        subtasks: ["Verificar suprimentos", "Trocar roupa de cama e banho"],
      },
      {
        title: "Limpeza pós-estadia",
        description: null,
        priority: "media",
        dueOffsetDays: 5,
        subtasks: ["Inventário de danos", "Reposição de suprimentos"],
      },
    ],
    isActive: true,
    createdBy: colaboradores.patricia.id,
    createdByName: colaboradores.patricia.name,
    createdAt: past(120),
    updatedAt: past(30),
  },
  {
    id: "template-02",
    name: "Checklist de Análise de Projeto",
    description:
      "Gerado quando um projeto é submetido para análise (cross-module Projetos → Tarefas).",
    workspace: "administrativo",
    trigger: { sourceModule: "projetos", event: "projeto_submetido" },
    tasks: [
      {
        title: "Verificar documentação do projeto",
        description: null,
        priority: "media",
        dueOffsetDays: 3,
        subtasks: [],
      },
      {
        title: "Validar organização vinculada",
        description: null,
        priority: "media",
        dueOffsetDays: 4,
        subtasks: [],
      },
    ],
    isActive: true,
    createdBy: colaboradores.patricia.id,
    createdByName: colaboradores.patricia.name,
    createdAt: past(100),
    updatedAt: past(100),
  },
  {
    id: "template-03",
    name: "Action Items de Reunião",
    description: "Gerado ao encerrar uma ata de reunião na Intranet.",
    workspace: "administrativo",
    trigger: { sourceModule: "intranet", event: "reuniao_encerrada" },
    tasks: [
      {
        title: "Registrar ata da reunião",
        description: null,
        priority: "media",
        dueOffsetDays: 1,
        subtasks: [],
      },
    ],
    isActive: true,
    createdBy: colaboradores.patricia.id,
    createdByName: colaboradores.patricia.name,
    createdAt: past(80),
    updatedAt: past(80),
  },
  {
    id: "template-04",
    name: "Onboarding de Colaborador",
    description:
      "Disparado manualmente pelo administrativo ao contratar um novo colaborador.",
    workspace: "administrativo",
    trigger: null,
    tasks: [
      {
        title: "Criar acessos aos sistemas",
        description: null,
        priority: "alta",
        dueOffsetDays: 1,
        subtasks: ["Email institucional", "Acesso à Intranet"],
      },
      {
        title: "Agendar treinamento inicial",
        description: null,
        priority: "media",
        dueOffsetDays: 3,
        subtasks: [],
      },
    ],
    isActive: true,
    createdBy: colaboradores.patricia.id,
    createdByName: colaboradores.patricia.name,
    createdAt: past(200),
    updatedAt: past(200),
  },
];

// ─── Export consolidado ───────────────────────────────────────────────────────

export const mockTasks: Task[] = [
  ...recurringTasks,
  ...autoTasks,
  ...richTasks,
  ...regularTasks,
];
