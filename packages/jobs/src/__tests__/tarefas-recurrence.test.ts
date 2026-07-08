/**
 * tarefas-recurrence.test.ts — runTarefasRecurrence (P-4.8, cron registrado
 * em packages/jobs/src/crons/tarefas.ts).
 *
 * Débito de infraestrutura de teste registrado em SESSIONS.md: P-4.12 (P-X.12
 * — Testes Tarefas) lista como "arquivos permitidos" só os 4 arquivos em
 * apps/tarefas/src/__tests__/. A geração real da próxima tarefa a partir de
 * next_run_at, porém, vive inteiramente em packages/jobs/src/crons/tarefas.ts
 * (runTarefasRecurrence) — não em apps/tarefas — e esse pacote não expõe uma
 * rota de import para "./crons/tarefas" no "exports" de package.json, então
 * não dá para testar a função real a partir de um arquivo em outro app/pacote
 * sem alterar esse mapa de exports (fora do escopo de arquivos permitidos de
 * P-4.12). Testar aqui, no próprio pacote (mesmo padrão de
 * projetos-evaluation-reminders.test.ts), fecha essa lacuna sem exigir essa
 * mudança de escopo.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  taskTemplates,
  templateItems,
  recurrenceRules,
  tasks,
  subtasks,
} from "@hebron/db/schema";
import { runTarefasRecurrence } from "../crons/tarefas";

const IDS = {
  owner: "fdaa0000-0000-0000-0000-000000000001",
  templateActive: "fdbb0000-0000-0000-0000-000000000001",
  templateInactive: "fdbb0000-0000-0000-0000-000000000002",
  ruleActiveDue: "fdcc0000-0000-0000-0000-000000000001",
  ruleInactiveDue: "fdcc0000-0000-0000-0000-000000000002",
  ruleEndedInPast: "fdcc0000-0000-0000-0000-000000000003",
};

let workspaceId: string;
const createdTaskIds = new Set<string>();

function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// runTarefasRecurrence calcula next_run_at a partir do valor ANTERIOR da
// própria regra (rule.nextRunAt ?? now), não do instante em que o cron roda
// — mantém a cadência estável em vez de deslizar a cada execução atrasada.
// Por isso a asserção de "avançou" compara com o valor original de seed
// (dueAt), não com o horário em que o teste chama runTarefasRecurrence().
const dueAt = daysFromNow(-1);

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.owner,
      email: "tarefas-recurrence-cron@test.hebron",
      fullName: "Tarefas Recurrence Cron Owner",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.owner, role: "colaborador", grantedBy: IDS.owner })
    .onConflictDoNothing();

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "tecnologia_inovacao"))
    .limit(1);
  if (!ws)
    throw new Error(
      "Workspace tecnologia_inovacao não encontrado (seed ausente)",
    );
  workspaceId = ws.id;

  await db
    .insert(taskTemplates)
    .values([
      {
        id: IDS.templateActive,
        name: "Template ativo (cron)",
        workspaceId,
        isActive: true,
        createdBy: IDS.owner,
      },
      {
        id: IDS.templateInactive,
        name: "Template inativo (cron)",
        workspaceId,
        isActive: false,
        createdBy: IDS.owner,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(templateItems)
    .values([
      {
        taskTemplateId: IDS.templateActive,
        title: "Revisar relatório mensal",
        priority: "media",
        subtasks: ["Conferir números", "Enviar para revisão"],
        order: 0,
      },
      {
        taskTemplateId: IDS.templateActive,
        title: "Publicar relatório",
        priority: "baixa",
        subtasks: [],
        order: 1,
      },
      {
        taskTemplateId: IDS.templateInactive,
        title: "Item de template inativo",
        priority: "media",
        subtasks: [],
        order: 0,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(recurrenceRules)
    .values([
      {
        id: IDS.ruleActiveDue,
        taskTemplateId: IDS.templateActive,
        type: "diaria",
        interval: 1,
        nextRunAt: dueAt,
        endDate: null,
      },
      {
        id: IDS.ruleInactiveDue,
        taskTemplateId: IDS.templateInactive,
        type: "diaria",
        interval: 1,
        nextRunAt: dueAt,
        endDate: null,
      },
      {
        id: IDS.ruleEndedInPast,
        taskTemplateId: IDS.templateActive,
        type: "diaria",
        interval: 1,
        nextRunAt: dueAt,
        endDate: daysFromNow(-2),
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  if (createdTaskIds.size > 0) {
    const ids = Array.from(createdTaskIds);
    await db.delete(subtasks).where(inArray(subtasks.taskId, ids));
    await db.delete(tasks).where(inArray(tasks.id, ids));
  }
  await db
    .delete(recurrenceRules)
    .where(
      inArray(recurrenceRules.id, [
        IDS.ruleActiveDue,
        IDS.ruleInactiveDue,
        IDS.ruleEndedInPast,
      ]),
    );
  await db
    .delete(templateItems)
    .where(
      inArray(templateItems.taskTemplateId, [
        IDS.templateActive,
        IDS.templateInactive,
      ]),
    );
  await db
    .delete(taskTemplates)
    .where(
      inArray(taskTemplates.id, [IDS.templateActive, IDS.templateInactive]),
    );
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, IDS.owner));
  await db.delete(users).where(eq(users.id, IDS.owner));
});

describe("runTarefasRecurrence", () => {
  // As 3 regras de fixture ficam due (ou não) simultaneamente — um único
  // disparo do cron já decide o destino de todas. Rodar de novo a cada teste
  // reagendaria as regras já processadas para o futuro e quebraria as
  // asserções de "avançou" (elas deixariam de estar due na segunda chamada).
  beforeAll(async () => {
    await runTarefasRecurrence();
  });

  it("regra vencida de template ativo: instancia uma tarefa por template_item, com subtarefas, e reagenda next_run_at", async () => {
    const generatedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.recurrenceParentId, IDS.templateActive));
    generatedTasks.forEach((t) => createdTaskIds.add(t.id));

    expect(generatedTasks).toHaveLength(2);
    expect(
      generatedTasks.every(
        (t) =>
          t.source === "manual" &&
          t.createdBy === IDS.owner &&
          t.workspaceId === workspaceId,
      ),
    ).toBe(true);

    const revisao = requireDefined(
      generatedTasks.find((t) => t.title === "Revisar relatório mensal"),
      "revisao",
    );
    const revisaoSubtasks = await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, revisao.id));
    expect(revisaoSubtasks.map((s) => s.title).sort()).toEqual(
      ["Conferir números", "Enviar para revisão"].sort(),
    );

    const [rule] = await db
      .select()
      .from(recurrenceRules)
      .where(eq(recurrenceRules.id, IDS.ruleActiveDue));
    expect(rule?.nextRunAt).toBeDefined();
    expect((rule?.nextRunAt as Date).getTime()).toBeGreaterThan(
      dueAt.getTime(),
    );
  });

  it("regra vencida de template inativo: NÃO instancia tarefas, mas ainda reagenda next_run_at", async () => {
    const generatedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.recurrenceParentId, IDS.templateInactive));
    expect(generatedTasks).toHaveLength(0);

    const [rule] = await db
      .select()
      .from(recurrenceRules)
      .where(eq(recurrenceRules.id, IDS.ruleInactiveDue));
    expect((rule?.nextRunAt as Date).getTime()).toBeGreaterThan(
      dueAt.getTime(),
    );
  });

  it("regra com end_date no passado: NÃO instancia e NÃO reagenda (fica parada)", async () => {
    const generatedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.recurrenceParentId, IDS.templateActive));
    // Nenhuma tarefa deve ter recurrenceParentId ligada a esta regra além das
    // 2 já esperadas do ruleActiveDue (mesmo template) — a regra encerrada
    // não gera uma 3ª leva.
    expect(generatedTasks.length).toBeLessThanOrEqual(2);

    const [rule] = await db
      .select()
      .from(recurrenceRules)
      .where(eq(recurrenceRules.id, IDS.ruleEndedInPast));
    // A regra nunca avança: next_run_at continua exatamente no valor
    // original de seed (vencido), já que end_date no passado a exclui da
    // seleção de regras due.
    expect((rule?.nextRunAt as Date).getTime()).toBe(dueAt.getTime());
  });
});
