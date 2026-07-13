/**
 * templates.test.ts — templates de tarefas (P-4.8: actions/templates.ts)
 *
 * Cobre createTaskTemplate (template + template_items) e
 * instantiateTaskTemplate (instancia todas as tarefas filhas, com suas
 * subtarefas pré-definidas).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  taskTemplates,
  templateItems,
  tasks,
  subtasks,
} from "@hebron/db/schema";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const ACTOR_ID = "ec000000-0000-0000-0000-000000000001";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
    designations: [],
  }),
}));

const IDS = {
  actor: ACTOR_ID,
  inactiveTemplate: "ec110000-0000-0000-0000-000000000001",
  emptyTemplate: "ec110000-0000-0000-0000-000000000002",
};

let workspaceId: string;
const createdTaskIds = new Set<string>();

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.actor,
      email: "templates-test@test.hebron",
      fullName: "Templates Tester",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.actor, role: "colaborador", grantedBy: IDS.actor })
    .onConflictDoNothing();

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "comunicacao"))
    .limit(1);
  if (!ws)
    throw new Error("Workspace comunicacao não encontrado (seed ausente)");
  workspaceId = ws.id;

  await db
    .insert(taskTemplates)
    .values([
      {
        id: IDS.inactiveTemplate,
        name: "Template Inativo",
        workspaceId,
        isActive: false,
        createdBy: IDS.actor,
      },
      {
        id: IDS.emptyTemplate,
        name: "Template Sem Itens",
        workspaceId,
        isActive: true,
        createdBy: IDS.actor,
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(templateItems)
    .values({
      taskTemplateId: IDS.inactiveTemplate,
      title: "Item de template inativo",
      priority: "media",
      subtasks: [],
      order: 0,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  if (createdTaskIds.size > 0) {
    const ids = Array.from(createdTaskIds);
    await db.delete(subtasks).where(inArray(subtasks.taskId, ids));
    await db.delete(tasks).where(inArray(tasks.id, ids));
  }
  await db
    .delete(taskTemplates)
    .where(
      inArray(taskTemplates.id, [IDS.inactiveTemplate, IDS.emptyTemplate]),
    );
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, IDS.actor));
  await db.delete(users).where(eq(users.id, IDS.actor));
});

describe("createTaskTemplate — cria template com template_items", () => {
  it("cria o template e todas as tarefas pré-definidas", async () => {
    const { createTaskTemplate } = await import("../actions/templates");

    const result = await createTaskTemplate({
      name: "Checklist de Onboarding",
      description: null,
      workspace: "comunicacao",
      tasks: [
        {
          title: "Enviar boas-vindas",
          description: null,
          priority: "media",
          dueOffsetDays: 1,
          subtasks: ["Redigir e-mail", "Enviar e-mail"],
        },
        {
          title: "Agendar reunião de integração",
          description: null,
          priority: "alta",
          dueOffsetDays: 3,
          subtasks: [],
        },
      ],
      trigger: null,
    });

    expect(result?.serverError).toBeUndefined();
    const templateId = result?.data?.template.id as unknown as string;
    expect(templateId).toBeTruthy();

    const items = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.taskTemplateId, templateId));
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.title).sort()).toEqual(
      ["Agendar reunião de integração", "Enviar boas-vindas"].sort(),
    );

    await db
      .delete(templateItems)
      .where(eq(templateItems.taskTemplateId, templateId));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, templateId));
  });
});

describe("instantiateTaskTemplate — instancia todas as tarefas filhas", () => {
  it("cria uma tarefa por template_item, cada uma com suas subtarefas pré-definidas", async () => {
    const { createTaskTemplate, instantiateTaskTemplate } =
      await import("../actions/templates");

    const created = await createTaskTemplate({
      name: "Checklist de Análise",
      description: null,
      workspace: "comunicacao",
      tasks: [
        {
          title: "Revisar documentação",
          description: null,
          priority: "media",
          dueOffsetDays: 2,
          subtasks: ["Ler edital", "Conferir anexos", "Registrar parecer"],
        },
        {
          title: "Validar orçamento",
          description: null,
          priority: "alta",
          dueOffsetDays: 5,
          subtasks: ["Conferir planilha"],
        },
        {
          title: "Notificar diretoria",
          description: null,
          priority: "baixa",
          dueOffsetDays: null,
          subtasks: [],
        },
      ],
      trigger: null,
    });
    expect(created?.serverError).toBeUndefined();
    const templateId = created?.data?.template.id as unknown as string;

    const result = await instantiateTaskTemplate({ templateId });
    expect(result?.serverError).toBeUndefined();
    const taskIds = result?.data?.taskIds as unknown as string[];
    expect(taskIds).toHaveLength(3);
    taskIds.forEach((id) => createdTaskIds.add(id));

    const createdTasks = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.id, taskIds));
    expect(createdTasks).toHaveLength(3);
    expect(createdTasks.every((t) => t.workspaceId === workspaceId)).toBe(true);
    expect(createdTasks.map((t) => t.title).sort()).toEqual(
      [
        "Notificar diretoria",
        "Revisar documentação",
        "Validar orçamento",
      ].sort(),
    );

    const allSubtasks = await db
      .select()
      .from(subtasks)
      .where(inArray(subtasks.taskId, taskIds));

    const revisao = createdTasks.find(
      (t) => t.title === "Revisar documentação",
    );
    const orcamento = createdTasks.find((t) => t.title === "Validar orçamento");
    const notificar = createdTasks.find(
      (t) => t.title === "Notificar diretoria",
    );

    expect(
      allSubtasks
        .filter((s) => s.taskId === revisao?.id)
        .map((s) => s.title)
        .sort(),
    ).toEqual(["Conferir anexos", "Ler edital", "Registrar parecer"].sort());
    expect(
      allSubtasks.filter((s) => s.taskId === orcamento?.id).map((s) => s.title),
    ).toEqual(["Conferir planilha"]);
    expect(allSubtasks.filter((s) => s.taskId === notificar?.id)).toHaveLength(
      0,
    );

    await db
      .delete(templateItems)
      .where(eq(templateItems.taskTemplateId, templateId));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, templateId));
  });

  it("template inativo: recusa a instanciação", async () => {
    const { instantiateTaskTemplate } = await import("../actions/templates");
    const result = await instantiateTaskTemplate({
      templateId: IDS.inactiveTemplate,
    });
    expect(result?.serverError).toBeDefined();
  });

  it("template sem tarefas definidas: recusa a instanciação", async () => {
    const { instantiateTaskTemplate } = await import("../actions/templates");
    const result = await instantiateTaskTemplate({
      templateId: IDS.emptyTemplate,
    });
    expect(result?.serverError).toBeDefined();
  });
});

describe("updateTaskTemplate — edita e substitui os template_items", () => {
  it("persiste nome, descrição e o novo conjunto de tarefas", async () => {
    const { createTaskTemplate, updateTaskTemplate } =
      await import("../actions/templates");

    const created = await createTaskTemplate({
      name: "Template Original",
      description: "descrição original",
      workspace: "comunicacao",
      tasks: [
        {
          title: "Tarefa antiga A",
          description: null,
          priority: "media",
          dueOffsetDays: null,
          subtasks: [],
        },
        {
          title: "Tarefa antiga B",
          description: null,
          priority: "baixa",
          dueOffsetDays: null,
          subtasks: [],
        },
      ],
      trigger: null,
    });
    const templateId = created?.data?.template.id as unknown as string;
    expect(templateId).toBeTruthy();

    const result = await updateTaskTemplate({
      templateId,
      name: "Template Renomeado",
      description: "nova descrição",
      workspace: "comunicacao",
      tasks: [
        {
          title: "Tarefa nova única",
          description: null,
          priority: "alta",
          dueOffsetDays: 4,
          subtasks: ["Passo 1"],
        },
      ],
      trigger: null,
    });
    expect(result?.serverError).toBeUndefined();

    const [row] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId));
    expect(row?.name).toBe("Template Renomeado");
    expect(row?.description).toBe("nova descrição");

    const items = await db
      .select()
      .from(templateItems)
      .where(eq(templateItems.taskTemplateId, templateId));
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Tarefa nova única");
    expect(items[0]?.dueOffsetDays).toBe(4);

    await db
      .delete(templateItems)
      .where(eq(templateItems.taskTemplateId, templateId));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, templateId));
  });

  it("respeita o gate de papel: diretor não pode editar", async () => {
    const { updateTaskTemplate } = await import("../actions/templates");
    const { resolveSession } = await import("@hebron/auth/server");
    vi.mocked(resolveSession).mockResolvedValueOnce({
      actorId: IDS.actor,
      roles: ["diretor"],
      designations: [],
    });

    const result = await updateTaskTemplate({
      templateId: IDS.inactiveTemplate,
      name: "Tentativa do diretor",
      description: null,
      workspace: "comunicacao",
      tasks: [
        {
          title: "Item qualquer",
          description: null,
          priority: "media",
          dueOffsetDays: null,
          subtasks: [],
        },
      ],
      trigger: null,
    });
    expect(result?.serverError).toBeDefined();
  });
});

describe("toggleTaskTemplate — ativa/desativa", () => {
  it("persiste isActive e bloqueia instanciação quando desativado", async () => {
    const { createTaskTemplate, toggleTaskTemplate, instantiateTaskTemplate } =
      await import("../actions/templates");

    const created = await createTaskTemplate({
      name: "Template Alternável",
      description: null,
      workspace: "comunicacao",
      tasks: [
        {
          title: "Tarefa do alternável",
          description: null,
          priority: "media",
          dueOffsetDays: null,
          subtasks: [],
        },
      ],
      trigger: null,
    });
    const templateId = created?.data?.template.id as unknown as string;

    const off = await toggleTaskTemplate({ templateId, isActive: false });
    expect(off?.serverError).toBeUndefined();
    const [afterOff] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId));
    expect(afterOff?.isActive).toBe(false);

    const blocked = await instantiateTaskTemplate({ templateId });
    expect(blocked?.serverError).toBeDefined();

    const on = await toggleTaskTemplate({ templateId, isActive: true });
    expect(on?.serverError).toBeUndefined();
    const [afterOn] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId));
    expect(afterOn?.isActive).toBe(true);

    await db
      .delete(templateItems)
      .where(eq(templateItems.taskTemplateId, templateId));
    await db.delete(taskTemplates).where(eq(taskTemplates.id, templateId));
  });
});
