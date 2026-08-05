import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import {
  createSupabaseServerActionClient,
  resolveSession,
} from "@hebron/auth/server";
import type { ActionSession } from "@hebron/auth/server";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import type { AuthenticatedTx } from "@hebron/db/authenticated";
import type { Role } from "@hebron/types/roles";
import {
  users,
  roleAssignments,
  workspaces,
  taskTagLabels,
  tasks,
  subtasks,
  assignees,
  comments,
  taskAttachments,
  timeEntries,
  taskTags,
  taskTemplates,
  templateItems,
  recurrenceRules,
  approvalRequests,
} from "@hebron/db/schema";
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

// ---------------------------------------------------------------------------
// Sessão — mesmo padrão de apps/projetos/src/lib/session.ts (G5), mas vive
// aqui porque lib/session.ts não está na lista de arquivos permitidos de
// P-4.9 (registrado em SESSIONS.md).
// ---------------------------------------------------------------------------

const STAFF_ROLES: Role[] = [
  "colaborador",
  "diretor",
  "conselheiro",
  "super_admin",
];

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

  // Leitura própria (users_select_own, 0000_initial.sql) — sem exceção
  // service-level, o próprio auth.uid() já é user.id.
  const rows = await withAuthenticatedContext({ actorId: user.id }, (tx) =>
    tx
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
  );

  return {
    id: user.id,
    fullName: rows[0]?.fullName ?? null,
    email: user.email ?? null,
  };
}

/** Gate para `(dashboard)/layout.tsx`: papel interno colaborador+ (mesmo
 * conjunto de `staffAction` em actions/*.ts) — transparência interna (BRAIN
 * §6.9). Bloqueia papéis externos (submissor, hospede, aluno, ouvinte). */
export async function requireStaffSession(): Promise<ActionSession> {
  const cookieStore = await cookies();

  let session: ActionSession;
  try {
    session = await resolveSession(cookieStore);
  } catch {
    redirect(CANONICAL_LOGIN_URL);
  }

  if (!session.roles.some((r) => STAFF_ROLES.includes(r))) {
    redirect(CANONICAL_LOGIN_URL);
  }

  return session;
}

/**
 * Resolve o actorId da sessão corrente para as funções de leitura abaixo,
 * que não recebem `ctx` de uma Server Action (são chamadas direto de Server
 * Components) — mesmo padrão de apps/intranet/src/lib/queries.ts.
 */
async function getActorId(): Promise<string> {
  const cookieStore = await cookies();
  const { actorId } = await resolveSession(cookieStore);
  return actorId;
}

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

export interface Person {
  id: string;
  name: string;
}

/**
 * Exceção service-level (mesmo padrão de getDirectoryMembers em
 * apps/intranet/src/lib/queries.ts, F3-15/S-57): `tasks_select_staff` e
 * afins já dão a colaborador/diretor/conselheiro acesso a toda tarefa
 * (transparência interna, BRAIN §6.9), mas o nome de quem é assignee/autor/
 * uploader (public.users) só é visível via `users_select_own`/
 * `users_select_admin` (super_admin/diretor) — sob RLS normal um
 * colaborador veria "—" no lugar de qualquer nome de terceiro. Só fullName
 * sai daqui.
 */
async function getUsersMap(tx: AuthenticatedTx): Promise<Map<string, string>> {
  const rows = await withSystemRole(tx, (sysTx) =>
    sysTx.select({ id: users.id, fullName: users.fullName }).from(users),
  );
  return new Map(rows.map((r) => [r.id, r.fullName ?? "—"]));
}

/**
 * Mesma exceção de getUsersMap acima: `role_assignments_select_own`/
 * `role_assignments_select_admin` (0000_initial.sql) não cobrem colaborador
 * lendo o papel de terceiros — necessário para montar a lista de possíveis
 * responsáveis/aprovadores ao criar tarefa ou pedido de aprovação.
 */
async function getUsersByRoles(
  tx: AuthenticatedTx,
  roles: Role[],
): Promise<Person[]> {
  const rows = await withSystemRole(tx, (sysTx) =>
    sysTx
      .selectDistinct({ id: users.id, fullName: users.fullName })
      .from(roleAssignments)
      .innerJoin(users, eq(users.id, roleAssignments.userId))
      .where(inArray(roleAssignments.role, roles)),
  );

  return rows
    .map((r) => ({ id: r.id, name: r.fullName ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Colaborador OU super_admin — diretor/conselheiro nunca recebem tarefa
 * operacional (BRAIN §6.9). */
export async function getAssignableUsers(): Promise<Person[]> {
  const actorId = await getActorId();
  return withAuthenticatedContext({ actorId }, (tx) =>
    getUsersByRoles(tx, ["colaborador", "super_admin"]),
  );
}

/** Diretor, conselheiro OU super_admin — quem pode responder um pedido de
 * aprovação. */
export async function getApprovers(): Promise<Person[]> {
  const actorId = await getActorId();
  return withAuthenticatedContext({ actorId }, (tx) =>
    getUsersByRoles(tx, ["diretor", "conselheiro", "super_admin"]),
  );
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function getTags(): Promise<Tag[]> {
  const actorId = await getActorId();
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx.select().from(taskTagLabels).orderBy(asc(taskTagLabels.name)),
  );
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color }));
}

// ---------------------------------------------------------------------------
// Workspaces — 6 fixos (BRAIN §6.9), seedados na migration.
// ---------------------------------------------------------------------------

async function getWorkspaceMaps(tx: AuthenticatedTx): Promise<{
  idToSlug: Map<string, Workspace>;
  slugToId: Map<Workspace, string>;
}> {
  const rows = await tx.select().from(workspaces);
  return {
    idToSlug: new Map(rows.map((w) => [w.id, w.slug as Workspace])),
    slugToId: new Map(rows.map((w) => [w.slug as Workspace, w.id])),
  };
}

// ---------------------------------------------------------------------------
// Tasks — assembla o formato rico de @hebron/types/tarefas a partir das
// tabelas normalizadas. Sem paginação/índices finos (escala da ONG, mesmo
// padrão de apps/financeiro/src/lib/queries.ts).
// ---------------------------------------------------------------------------

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k) ?? [];
    list.push(row);
    map.set(k, list);
  }
  return map;
}

async function assembleTasks(
  tx: AuthenticatedTx,
  taskRows: (typeof tasks.$inferSelect)[],
): Promise<Task[]> {
  if (taskRows.length === 0) return [];
  const ids = taskRows.map((t) => t.id);

  // getUsersMap troca a ROLE da sessão (RESET ROLE / SET LOCAL ROLE
  // authenticated via withSystemRole) — precisa terminar antes de qualquer
  // outra query concorrente na MESMA conexão/transação (Promise.all abaixo),
  // senão a troca de role de uma query vaza para as outras em andamento na
  // mesma sessão Postgres. Mesma cautela de apps/intranet/src/lib/queries.ts
  // (getDirectoryMembers/getMeetingSessionsWithDecisions nunca misturam
  // withSystemRole dentro de um Promise.all).
  const usersMap = await getUsersMap(tx);

  const [
    { idToSlug },
    assigneeRows,
    taskTagRows,
    subtaskRows,
    commentRows,
    attachmentRows,
    timeEntryRows,
    approvalRows,
    recurrenceRows,
  ] = await Promise.all([
    getWorkspaceMaps(tx),
    tx.select().from(assignees).where(inArray(assignees.taskId, ids)),
    tx
      .select({ taskId: taskTags.taskId, tag: taskTagLabels })
      .from(taskTags)
      .innerJoin(taskTagLabels, eq(taskTagLabels.id, taskTags.tagId))
      .where(inArray(taskTags.taskId, ids)),
    tx.select().from(subtasks).where(inArray(subtasks.taskId, ids)),
    tx.select().from(comments).where(inArray(comments.taskId, ids)),
    tx
      .select()
      .from(taskAttachments)
      .where(
        and(
          eq(taskAttachments.parentType, "task"),
          inArray(taskAttachments.parentId, ids),
        ),
      ),
    tx.select().from(timeEntries).where(inArray(timeEntries.taskId, ids)),
    tx
      .select()
      .from(approvalRequests)
      .where(inArray(approvalRequests.taskId, ids)),
    tx.select().from(recurrenceRules),
  ]);

  const assigneesByTask = groupBy(assigneeRows, (a) => a.taskId);
  const tagsByTask = groupBy(taskTagRows, (r) => r.taskId);
  const subtasksByTask = groupBy(subtaskRows, (s) => s.taskId);
  const commentsByTask = groupBy(commentRows, (c) => c.taskId);
  const attachmentsByTask = groupBy(attachmentRows, (a) => a.parentId);
  const timeEntriesByTask = groupBy(timeEntryRows, (e) => e.taskId);

  // Duas requisições de aprovação na mesma tarefa não são hipótese (P-4.8c):
  // nada impede um segundo pedido depois de uma rejeição, e é o comportamento
  // certo (pede-se de novo). Por tarefa, ordena por requested_at desc — o
  // pedido corrente é sempre o [0] explícito, nunca "o que o Map de chave
  // única sobrescreveu por último" (essa era a falha: dependia da ordem
  // física, não garantida, do SELECT sem ORDER BY).
  const approvalRowsByTask = groupBy(approvalRows, (r) => r.taskId);
  for (const rows of approvalRowsByTask.values()) {
    rows.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
  function toApprovalRequestView(
    row: (typeof approvalRows)[number],
  ): ApprovalRequest {
    return {
      id: row.id,
      taskId: row.taskId,
      requestedStatus: row.requestedStatus,
      requestedBy: row.requestedBy,
      requestedByName: usersMap.get(row.requestedBy) ?? "—",
      approverId: row.approverId,
      approverName: usersMap.get(row.approverId) ?? "—",
      status: row.status,
      notes: row.notes,
      requestedAt: row.requestedAt,
      resolvedAt: row.resolvedAt,
    };
  }

  const recurrenceByTemplate = new Map(
    recurrenceRows.map((r) => [r.taskTemplateId, r]),
  );

  return taskRows.map((t): Task => {
    const taskAssignees: Assignee[] = (assigneesByTask.get(t.id) ?? []).map(
      (a) => ({
        userId: a.userId,
        userName: usersMap.get(a.userId) ?? "—",
        assignedAt: a.assignedAt,
      }),
    );

    const taskTagsList: Tag[] = (tagsByTask.get(t.id) ?? []).map((r) => ({
      id: r.tag.id,
      name: r.tag.name,
      color: r.tag.color,
    }));

    const taskSubtasks: Subtask[] = (subtasksByTask.get(t.id) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        taskId: s.taskId,
        title: s.title,
        isDone: s.completed,
        assigneeId: s.assigneeId,
        assigneeName: s.assigneeId ? (usersMap.get(s.assigneeId) ?? "—") : null,
        order: s.order,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));

    const subtaskProgress =
      taskSubtasks.length > 0
        ? {
            done: taskSubtasks.filter((s) => s.isDone).length,
            total: taskSubtasks.length,
          }
        : null;

    const taskComments: Comment[] = (commentsByTask.get(t.id) ?? [])
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((c) => ({
        id: c.id,
        taskId: c.taskId,
        authorId: c.authorId,
        authorName: usersMap.get(c.authorId) ?? "—",
        content: c.content,
        mentions: c.mentions,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

    const taskAttachmentsList: Attachment[] = (
      attachmentsByTask.get(t.id) ?? []
    ).map((a) => ({
      id: a.id,
      parentType: a.parentType,
      parentId: a.parentId,
      storageKey: a.storageKey,
      fileName: a.fileName,
      fileSizeBytes: a.fileSizeBytes,
      mimeType: a.mimeType,
      uploadedBy: a.uploadedBy,
      uploadedByName: usersMap.get(a.uploadedBy) ?? "—",
      uploadedAt: a.uploadedAt,
    }));

    const taskTimeEntries: TimeEntry[] = (
      timeEntriesByTask.get(t.id) ?? []
    ).map((e) => ({
      id: e.id,
      taskId: e.taskId,
      userId: e.userId,
      userName: usersMap.get(e.userId) ?? "—",
      startedAt: e.startedAt,
      endedAt: e.endedAt,
      durationMinutes: e.durationMinutes,
      notes: e.notes,
    }));

    // [0] é sempre o mais recente por requested_at (ordenado acima) — o
    // corrente. O resto é histórico: pedidos anteriores, sempre resolvidos
    // (o índice único de tarefas.approval_requests garante no máximo um
    // 'pendente' por tarefa — migration 0076).
    const [currentApprovalRow, ...pastApprovalRows] =
      approvalRowsByTask.get(t.id) ?? [];
    const approvalRequest: ApprovalRequest | null = currentApprovalRow
      ? toApprovalRequestView(currentApprovalRow)
      : null;
    const approvalHistory: ApprovalRequest[] = pastApprovalRows.map(
      toApprovalRequestView,
    );

    // recurrence_parent_id, quando presente numa tarefa gerada por
    // recorrência, guarda o task_template_id que a originou (ver
    // packages/jobs/src/crons/tarefas.ts::instantiateTemplate).
    const recurrenceRow = t.recurrenceParentId
      ? recurrenceByTemplate.get(t.recurrenceParentId)
      : undefined;
    const recurrenceRule: RecurrenceRule | null = recurrenceRow
      ? {
          type: recurrenceRow.type,
          interval: recurrenceRow.interval,
          dayOfWeek: recurrenceRow.dayOfWeek,
          dayOfMonth: recurrenceRow.dayOfMonth,
          month: recurrenceRow.month,
          endDate: recurrenceRow.endDate,
        }
      : null;

    const sourceRef = t.sourceRef as {
      sourceModule: string;
      sourceId: string;
    } | null;

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      workspace: idToSlug.get(t.workspaceId) as Workspace,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate,
      assignees: taskAssignees,
      tags: taskTagsList,
      subtasks: taskSubtasks,
      subtaskProgress,
      comments: taskComments,
      attachments: taskAttachmentsList,
      timeEntries: taskTimeEntries,
      recurrenceRule,
      recurrenceParentId: t.recurrenceParentId,
      sourceModule: sourceRef?.sourceModule ?? null,
      sourceId: sourceRef?.sourceId ?? null,
      needsManualAssignment: t.needsManualAssignment,
      approvalRequest,
      approvalHistory,
      createdBy: t.createdBy,
      createdByName: usersMap.get(t.createdBy) ?? "—",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      completedAt: t.completedAt,
      deletedAt: t.deletedAt,
    };
  });
}

/** Todas as tarefas visíveis à equipe (BRAIN §6.9 — transparência interna). */
export async function getTasks(): Promise<Task[]> {
  const actorId = await getActorId();
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select()
      .from(tasks)
      .where(isNull(tasks.deletedAt))
      .orderBy(desc(tasks.createdAt));
    return assembleTasks(tx, rows);
  });
}

export async function getTasksByWorkspace(
  workspace: Workspace,
): Promise<Task[]> {
  const actorId = await getActorId();
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const { slugToId } = await getWorkspaceMaps(tx);
    const workspaceId = slugToId.get(workspace);
    if (!workspaceId) return [];

    const rows = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.createdAt));
    return assembleTasks(tx, rows);
  });
}

export async function getTaskById(id: string): Promise<Task | null> {
  const actorId = await getActorId();
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const rows = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .limit(1);
    const [assembled] = await assembleTasks(tx, rows);
    return assembled ?? null;
  });
}

/** Tarefas atribuídas ao usuário — usado pelo Modo foco (ferramenta pessoal,
 * não faz sentido mostrar a agenda de todo mundo — ambiguidade do mock
 * resolvida pela natureza do recurso; registrado em SESSIONS.md). */
export async function getAssignedTasks(userId: string): Promise<Task[]> {
  const actorId = await getActorId();
  const rows = await withAuthenticatedContext({ actorId }, (tx) =>
    tx
      .select({ taskId: assignees.taskId })
      .from(assignees)
      .where(eq(assignees.userId, userId)),
  );
  const taskIds = new Set(rows.map((r) => r.taskId));

  const all = await getTasks();
  return all.filter((t) => taskIds.has(t.id) || t.createdBy === userId);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const actorId = await getActorId();
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const { idToSlug } = await getWorkspaceMaps(tx);
    const usersMap = await getUsersMap(tx);

    const templateRows = await tx
      .select()
      .from(taskTemplates)
      .orderBy(desc(taskTemplates.createdAt));
    const ids = templateRows.map((t) => t.id);

    const itemRows =
      ids.length > 0
        ? await tx
            .select()
            .from(templateItems)
            .where(inArray(templateItems.taskTemplateId, ids))
            .orderBy(asc(templateItems.order))
        : [];
    const itemsByTemplate = groupBy(itemRows, (i) => i.taskTemplateId);

    return templateRows.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      workspace: idToSlug.get(t.workspaceId) as Workspace,
      tasks: (itemsByTemplate.get(t.id) ?? []).map((i) => ({
        title: i.title,
        description: i.description,
        priority: i.priority,
        dueOffsetDays: i.dueOffsetDays,
        subtasks: i.subtasks,
      })),
      trigger:
        t.triggerSourceModule && t.triggerEvent
          ? { sourceModule: t.triggerSourceModule, event: t.triggerEvent }
          : null,
      isActive: t.isActive,
      createdBy: t.createdBy,
      createdByName: usersMap.get(t.createdBy) ?? "—",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  });
}

// ---------------------------------------------------------------------------
// Recorrências — visão por regra (ligada a um template), não por tarefa: o
// modelo real amarra recurrence_rules a task_templates (P-4.6), diferente do
// mock que anexava a regra direto na tarefa.
// ---------------------------------------------------------------------------

export interface RecurrenceRuleView {
  id: string;
  taskTemplateId: string;
  templateName: string;
  workspace: Workspace;
  type: RecurrenceRule["type"];
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  month: number | null;
  endDate: Date | null;
  nextRunAt: Date | null;
}

export async function getRecurrenceRuleViews(): Promise<RecurrenceRuleView[]> {
  const actorId = await getActorId();
  return withAuthenticatedContext({ actorId }, async (tx) => {
    const { idToSlug } = await getWorkspaceMaps(tx);
    const rows = await tx
      .select()
      .from(recurrenceRules)
      .orderBy(asc(recurrenceRules.nextRunAt));

    const templateIds = rows.map((r) => r.taskTemplateId);
    const templateRows =
      templateIds.length > 0
        ? await tx
            .select()
            .from(taskTemplates)
            .where(inArray(taskTemplates.id, templateIds))
        : [];
    const templateById = new Map(templateRows.map((t) => [t.id, t]));

    return rows.map((r) => {
      const template = templateById.get(r.taskTemplateId);
      return {
        id: r.id,
        taskTemplateId: r.taskTemplateId,
        templateName: template?.name ?? "Template removido",
        workspace: template
          ? (idToSlug.get(template.workspaceId) as Workspace)
          : "administrativo",
        type: r.type,
        interval: r.interval,
        dayOfWeek: r.dayOfWeek,
        dayOfMonth: r.dayOfMonth,
        month: r.month,
        endDate: r.endDate,
        nextRunAt: r.nextRunAt,
      };
    });
  });
}
