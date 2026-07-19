import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  subtasks,
  taskTemplates,
  tasks,
  templateItems,
  workspaces,
} from "@hebron/db/schema";
import { getSystemActorId } from "@hebron/db/system-actor";
import type { TaskPriority, Workspace } from "@hebron/types/tarefas";

// ---------------------------------------------------------------------------
// createAutoTask — Flats/Projetos/Intranet → Tarefas
//
// Ponto único de criação de tarefas automáticas geradas por outros módulos
// (BRAIN §7: "Flats → Tarefas: reserva confirmada gera tarefas de limpeza",
// "Intranet → Tarefas: action items de reunião viram tarefas", "Tarefas →
// Projetos: submissão cria checklist" — na direção inversa, quem cria a
// tarefa automática É o outro módulo, chamando esta função). Vive em
// packages/integrations (P-0.15), nunca em lib de app — apps nunca importam
// de outro app (G6.5, PROMPTS.md).
//
// Tarefas automáticas SEMPRE nascem sem responsável (needsManualAssignment
// = true, sem linha em tarefas.assignees): super_admin atribui manualmente
// depois (BRAIN §6.9). O chamador deve `await` esta função (nunca
// fire-and-forget) para que uma falha seja visível e tratável.
// ---------------------------------------------------------------------------

export interface CreateAutoTaskParams {
  title: string;
  description?: string | null;
  workspace: Workspace;
  priority?: TaskPriority;
  dueDate?: Date | null;
  /** Módulo de origem, ex.: "flats", "projetos", "intranet". */
  sourceModule: string;
  /** ID do registro que originou a tarefa automática no módulo de origem. */
  sourceId: string;
}

export interface CreateAutoTaskResult {
  taskId: string;
}

export async function createAutoTask(
  params: CreateAutoTaskParams,
): Promise<CreateAutoTaskResult> {
  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, params.workspace))
    .limit(1);
  if (!ws) throw new Error(`Módulo de tarefas inválido: ${params.workspace}`);

  const systemActorId = await getSystemActorId();

  const [task] = await db
    .insert(tasks)
    .values({
      title: params.title,
      description: params.description ?? null,
      workspaceId: ws.id,
      priority: params.priority ?? "media",
      dueDate: params.dueDate ?? null,
      source: "auto",
      sourceRef: {
        sourceModule: params.sourceModule,
        sourceId: params.sourceId,
      },
      needsManualAssignment: true,
      createdBy: systemActorId,
    })
    .returning({ id: tasks.id });
  if (!task) throw new Error("Falha ao criar tarefa automática");

  return { taskId: task.id };
}

// ---------------------------------------------------------------------------
// createAutoTaskChecklist — Projetos/Flats → Tarefas (checklist a partir de
// um template, ex. "submissão de projeto cria checklist de análise",
// "reserva confirmada cria tarefas de limpeza pré/pós-estadia").
//
// Consolida com createAutoTask acima: mesmo contrato de "tarefa automática"
// (source "auto", sourceRef ligando de volta ao registro de origem,
// needsManualAssignment sempre true — BRAIN §6.9), aplicado a cada
// tarefa pré-definida (`tarefas.template_items`) do template em vez de um
// único título/descrição avulsos. `dueOffsetDays` do item vira `dueDate`
// relativo a "agora" (mesma regra de apps/tarefas/src/actions/templates.ts
// ::instantiateTaskTemplate e packages/jobs/src/crons/tarefas.ts
// ::instantiateTemplate — duplicada aqui pela mesma razão documentada
// nesses dois: packages/integrations não pode importar de um app nem de
// packages/jobs).
// ---------------------------------------------------------------------------

export interface CreateAutoTaskChecklistParams {
  templateId: string;
  /** Módulo de origem, ex.: "projetos", "flats". */
  sourceModule: string;
  /** ID do registro que originou o checklist no módulo de origem. */
  sourceId: string;
}

export interface CreateAutoTaskChecklistResult {
  taskIds: string[];
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function createAutoTaskChecklist(
  params: CreateAutoTaskChecklistParams,
): Promise<CreateAutoTaskChecklistResult> {
  const [template] = await db
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.id, params.templateId))
    .limit(1);
  if (!template)
    throw new Error(`Template não encontrado: ${params.templateId}`);
  if (!template.isActive)
    throw new Error(`Template está inativo: ${params.templateId}`);

  const items = await db
    .select()
    .from(templateItems)
    .where(eq(templateItems.taskTemplateId, template.id))
    .orderBy(asc(templateItems.order));
  if (items.length === 0) {
    throw new Error(
      `Template não possui tarefas definidas: ${params.templateId}`,
    );
  }

  const systemActorId = await getSystemActorId();
  const now = new Date();
  const sourceRef = {
    sourceModule: params.sourceModule,
    sourceId: params.sourceId,
  };

  // Ids gerados aqui (a coluna tem defaultRandom()) para que tarefas e
  // subtarefas entrem em dois INSERTs em lote, em vez de dois por item do
  // template — o N+1 que rodava neste laço (P-9.3). Pré-gerar o id também
  // torna o vínculo subtarefa→tarefa explícito, sem depender da ordem do
  // RETURNING.
  const prepared = items.map((item) => ({ id: randomUUID(), item }));

  const taskRows = prepared.map(({ id, item }) => ({
    id,
    title: item.title,
    description: item.description,
    workspaceId: template.workspaceId,
    priority: item.priority,
    dueDate:
      item.dueOffsetDays !== null ? addDays(now, item.dueOffsetDays) : null,
    source: "auto" as const,
    sourceRef,
    needsManualAssignment: true,
    createdBy: systemActorId,
  }));

  const subtaskRows = prepared.flatMap(({ id, item }) =>
    item.subtasks.map((title, index) => ({
      taskId: id,
      title,
      order: index,
    })),
  );

  const taskIds = await db.transaction(async (tx) => {
    if (taskRows.length === 0) return [];

    const inserted = await tx
      .insert(tasks)
      .values(taskRows)
      .returning({ id: tasks.id });

    if (subtaskRows.length > 0) {
      await tx.insert(subtasks).values(subtaskRows);
    }

    return inserted.map((row) => row.id);
  });

  if (taskIds.length === 0) {
    throw new Error(
      `Falha ao criar tarefas do checklist a partir do template: ${params.templateId}`,
    );
  }

  return { taskIds };
}
