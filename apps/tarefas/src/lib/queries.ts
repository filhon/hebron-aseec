import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import {
  createSupabaseServerActionClient,
  resolveSession,
} from "@hebron/auth/server";
import type { ActionSession } from "@hebron/auth/server";
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

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

export interface Person {
  id: string;
  name: string;
}

async function getUsersMap(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users);
  return new Map(rows.map((r) => [r.id, r.fullName ?? "—"]));
}

async function getUsersByRoles(roles: Role[]): Promise<Person[]> {
  const rows = await db
    .selectDistinct({ id: users.id, fullName: users.fullName })
    .from(roleAssignments)
    .innerJoin(users, eq(users.id, roleAssignments.userId))
    .where(inArray(roleAssignments.role, roles));

  return rows
    .map((r) => ({ id: r.id, name: r.fullName ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Colaborador OU super_admin — diretor/conselheiro nunca recebem tarefa
 * operacional (BRAIN §6.9). */
export async function getAssignableUsers(): Promise<Person[]> {
  return getUsersByRoles(["colaborador", "super_admin"]);
}

/** Diretor, conselheiro OU super_admin — quem pode responder um pedido de
 * aprovação. */
export async function getApprovers(): Promise<Person[]> {
  return getUsersByRoles(["diretor", "conselheiro", "super_admin"]);
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function getTags(): Promise<Tag[]> {
  const rows = await db
    .select()
    .from(taskTagLabels)
    .orderBy(asc(taskTagLabels.name));
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color }));
}

// ---------------------------------------------------------------------------
// Workspaces — 6 fixos (BRAIN §6.9), seedados na migration.
// ---------------------------------------------------------------------------

async function getWorkspaceMaps(): Promise<{
  idToSlug: Map<string, Workspace>;
  slugToId: Map<Workspace, string>;
}> {
  const rows = await db.select().from(workspaces);
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
  taskRows: (typeof tasks.$inferSelect)[],
): Promise<Task[]> {
  if (taskRows.length === 0) return [];
  const ids = taskRows.map((t) => t.id);

  const [
    { idToSlug },
    usersMap,
    assigneeRows,
    taskTagRows,
    subtaskRows,
    commentRows,
    attachmentRows,
    timeEntryRows,
    approvalRows,
    recurrenceRows,
  ] = await Promise.all([
    getWorkspaceMaps(),
    getUsersMap(),
    db.select().from(assignees).where(inArray(assignees.taskId, ids)),
    db
      .select({ taskId: taskTags.taskId, tag: taskTagLabels })
      .from(taskTags)
      .innerJoin(taskTagLabels, eq(taskTagLabels.id, taskTags.tagId))
      .where(inArray(taskTags.taskId, ids)),
    db.select().from(subtasks).where(inArray(subtasks.taskId, ids)),
    db.select().from(comments).where(inArray(comments.taskId, ids)),
    db
      .select()
      .from(taskAttachments)
      .where(
        and(
          eq(taskAttachments.parentType, "task"),
          inArray(taskAttachments.parentId, ids),
        ),
      ),
    db.select().from(timeEntries).where(inArray(timeEntries.taskId, ids)),
    db
      .select()
      .from(approvalRequests)
      .where(inArray(approvalRequests.taskId, ids)),
    db.select().from(recurrenceRules),
  ]);

  const assigneesByTask = groupBy(assigneeRows, (a) => a.taskId);
  const tagsByTask = groupBy(taskTagRows, (r) => r.taskId);
  const subtasksByTask = groupBy(subtaskRows, (s) => s.taskId);
  const commentsByTask = groupBy(commentRows, (c) => c.taskId);
  const attachmentsByTask = groupBy(attachmentRows, (a) => a.parentId);
  const timeEntriesByTask = groupBy(timeEntryRows, (e) => e.taskId);
  const approvalByTask = new Map(approvalRows.map((r) => [r.taskId, r]));
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

    const approvalRow = approvalByTask.get(t.id);
    const approvalRequest: ApprovalRequest | null = approvalRow
      ? {
          id: approvalRow.id,
          taskId: approvalRow.taskId,
          requestedStatus: approvalRow.requestedStatus,
          requestedBy: approvalRow.requestedBy,
          requestedByName: usersMap.get(approvalRow.requestedBy) ?? "—",
          approverId: approvalRow.approverId,
          approverName: usersMap.get(approvalRow.approverId) ?? "—",
          status: approvalRow.status,
          notes: approvalRow.notes,
          requestedAt: approvalRow.requestedAt,
          resolvedAt: approvalRow.resolvedAt,
        }
      : null;

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
  const rows = await db
    .select()
    .from(tasks)
    .where(isNull(tasks.deletedAt))
    .orderBy(desc(tasks.createdAt));
  return assembleTasks(rows);
}

export async function getTasksByWorkspace(
  workspace: Workspace,
): Promise<Task[]> {
  const { slugToId } = await getWorkspaceMaps();
  const workspaceId = slugToId.get(workspace);
  if (!workspaceId) return [];

  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt)))
    .orderBy(desc(tasks.createdAt));
  return assembleTasks(rows);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
    .limit(1);
  const [assembled] = await assembleTasks(rows);
  return assembled ?? null;
}

/** Tarefas atribuídas ao usuário — usado pelo Modo foco (ferramenta pessoal,
 * não faz sentido mostrar a agenda de todo mundo — ambiguidade do mock
 * resolvida pela natureza do recurso; registrado em SESSIONS.md). */
export async function getAssignedTasks(userId: string): Promise<Task[]> {
  const rows = await db
    .select({ taskId: assignees.taskId })
    .from(assignees)
    .where(eq(assignees.userId, userId));
  const taskIds = new Set(rows.map((r) => r.taskId));

  const all = await getTasks();
  return all.filter((t) => taskIds.has(t.id) || t.createdBy === userId);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const { idToSlug } = await getWorkspaceMaps();
  const usersMap = await getUsersMap();

  const templateRows = await db
    .select()
    .from(taskTemplates)
    .orderBy(desc(taskTemplates.createdAt));
  const ids = templateRows.map((t) => t.id);

  const itemRows =
    ids.length > 0
      ? await db
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
  endDate: Date | null;
  nextRunAt: Date | null;
}

export async function getRecurrenceRuleViews(): Promise<RecurrenceRuleView[]> {
  const { idToSlug } = await getWorkspaceMaps();
  const rows = await db
    .select()
    .from(recurrenceRules)
    .orderBy(asc(recurrenceRules.nextRunAt));

  const templateIds = rows.map((r) => r.taskTemplateId);
  const templateRows =
    templateIds.length > 0
      ? await db
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
      endDate: r.endDate,
      nextRunAt: r.nextRunAt,
    };
  });
}
