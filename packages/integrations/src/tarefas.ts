import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { tasks, workspaces } from "@hebron/db/schema";
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
