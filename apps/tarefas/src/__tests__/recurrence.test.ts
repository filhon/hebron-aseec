/**
 * recurrence.test.ts — regras de recorrência (P-4.8: actions/recurrence.ts;
 * P-4.9d: updateRecurrenceRule pela tela, endRecurrenceRule, guarda de
 * "uma regra ativa por template")
 *
 * Cobre createRecurrenceRule/updateRecurrenceRule/endRecurrenceRule contra o
 * banco real: persistência do campo `month`, resolução de template e o
 * encaixe da regra com o cálculo de next_run_at. Usa o relógio real (sem
 * vi.useFakeTimers/vi.setSystemTime): packages/db/src/__tests__/
 * settings.test.ts documenta que fake timers travam o setTimeout interno
 * do driver `postgres` quando a suíte roda em singleFork — mesma config
 * usada aqui (vitest.config.ts). Por isso comparamos o valor real devolvido
 * pela action contra `computeNextRun` importado de
 * `@hebron/integrations/tarefas` (P-4.1b: cópia única, nenhum teste
 * reimplementa o cálculo), com tolerância de alguns segundos.
 *
 * O cálculo em si — os 4 tipos, overflow de dia em mês curto, ano bissexto,
 * ano de referência em regra anual — é coberto sem banco em
 * packages/integrations/src/__tests__/tarefas-recurrence.test.ts. A geração
 * real da próxima tarefa a partir de next_run_at, e o efeito de end_date
 * sobre ela, é responsabilidade do cron registrado em
 * packages/jobs/src/crons/tarefas.ts (runTarefasRecurrence), coberto em
 * packages/jobs/src/__tests__/tarefas-recurrence.test.ts.
 *
 * A guarda de "uma regra ativa por template" (P-4.9d) usa um template por
 * teste que cria uma regra — templates diferentes nunca colidem entre si —
 * e um template dedicado só para os testes que verificam a colisão em si.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  taskTemplates,
  recurrenceRules,
} from "@hebron/db/schema";
import { computeNextRun } from "@hebron/integrations/tarefas";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const ACTOR_ID = "eb000000-0000-0000-0000-000000000001";

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn().mockResolvedValue({
    actorId: ACTOR_ID,
    roles: ["colaborador"],
    designations: [],
  }),
}));

const TOLERANCE_MS = 10_000;

function expectCloseTo(actual: Date, expected: Date): void {
  expect(Math.abs(actual.getTime() - expected.getTime())).toBeLessThan(
    TOLERANCE_MS,
  );
}

const IDS = {
  actor: ACTOR_ID,
  templateDiaria: "eb110000-0000-0000-0000-000000000001",
  templateSemanal: "eb110000-0000-0000-0000-000000000002",
  templateMensal: "eb110000-0000-0000-0000-000000000003",
  templateAnual: "eb110000-0000-0000-0000-000000000004",
  templateUpdate: "eb110000-0000-0000-0000-000000000005",
  templateEnd: "eb110000-0000-0000-0000-000000000006",
  templateGuardCreate: "eb110000-0000-0000-0000-000000000007",
  templateGuardUpdate: "eb110000-0000-0000-0000-000000000008",
  templateGuardIndex: "eb110000-0000-0000-0000-000000000009",
};

const TEMPLATE_IDS = [
  IDS.templateDiaria,
  IDS.templateSemanal,
  IDS.templateMensal,
  IDS.templateAnual,
  IDS.templateUpdate,
  IDS.templateEnd,
  IDS.templateGuardCreate,
  IDS.templateGuardUpdate,
  IDS.templateGuardIndex,
];

let workspaceId: string;

beforeAll(async () => {
  await db
    .insert(users)
    .values({
      id: IDS.actor,
      email: "recurrence-test@test.hebron",
      fullName: "Recurrence Tester",
    })
    .onConflictDoNothing();
  await db
    .insert(roleAssignments)
    .values({ userId: IDS.actor, role: "colaborador", grantedBy: IDS.actor })
    .onConflictDoNothing();

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "administrativo"))
    .limit(1);
  if (!ws)
    throw new Error("Workspace administrativo não encontrado (seed ausente)");
  workspaceId = ws.id;

  await db
    .insert(taskTemplates)
    .values(
      TEMPLATE_IDS.map((id) => ({
        id,
        name: `Template Recorrência Teste ${id}`,
        workspaceId,
        createdBy: IDS.actor,
      })),
    )
    .onConflictDoNothing();
});

afterAll(async () => {
  // recurrence_rules referencia task_templates com onDelete: "cascade" —
  // apagar os templates já limpa as regras criadas nos testes.
  await db.delete(taskTemplates).where(inArray(taskTemplates.id, TEMPLATE_IDS));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, IDS.actor));
  await db.delete(users).where(eq(users.id, IDS.actor));
});

describe("createRecurrenceRule — computeNextRun por tipo", () => {
  it("diária: soma interval dias a partir de agora", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");
    const from = new Date();
    const result = await createRecurrenceRule({
      taskTemplateId: IDS.templateDiaria,
      rule: {
        type: "diaria",
        interval: 3,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });

    expect(result?.serverError).toBeUndefined();
    const nextRunAt = new Date(
      result?.data?.rule.nextRunAt as unknown as string,
    );
    expectCloseTo(
      nextRunAt,
      computeNextRun(
        {
          type: "diaria",
          interval: 3,
          dayOfWeek: null,
          dayOfMonth: null,
          month: null,
        },
        from,
      ),
    );
  });

  it("semanal: avança para o próximo dia da semana configurado", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");
    const from = new Date();
    const targetDay = (from.getUTCDay() + 3) % 7;
    const result = await createRecurrenceRule({
      taskTemplateId: IDS.templateSemanal,
      rule: {
        type: "semanal",
        interval: 1,
        dayOfWeek: targetDay,
        dayOfMonth: null,
        endDate: null,
      },
    });

    expect(result?.serverError).toBeUndefined();
    const nextRunAt = new Date(
      result?.data?.rule.nextRunAt as unknown as string,
    );
    expectCloseTo(
      nextRunAt,
      computeNextRun(
        {
          type: "semanal",
          interval: 1,
          dayOfWeek: targetDay,
          dayOfMonth: null,
          month: null,
        },
        from,
      ),
    );
    expect(nextRunAt.getUTCDay()).toBe(targetDay);
  });

  it("mensal: soma interval meses e fixa o dia do mês", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");
    const from = new Date();
    const result = await createRecurrenceRule({
      taskTemplateId: IDS.templateMensal,
      rule: {
        type: "mensal",
        interval: 2,
        dayOfWeek: null,
        dayOfMonth: 15,
        endDate: null,
      },
    });

    expect(result?.serverError).toBeUndefined();
    const nextRunAt = new Date(
      result?.data?.rule.nextRunAt as unknown as string,
    );
    expectCloseTo(
      nextRunAt,
      computeNextRun(
        {
          type: "mensal",
          interval: 2,
          dayOfWeek: null,
          dayOfMonth: 15,
          month: null,
        },
        from,
      ),
    );
    expect(nextRunAt.getUTCDate()).toBe(15);
  });

  it("anual: usa o mês da regra, nunca o mês de criação", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");
    const from = new Date();
    // Mês fixo (janeiro) e diferente do mês de criação real do teste (roda
    // em qualquer época do ano) — é exatamente o caso do IPTU (S-73/P-4.1b).
    const result = await createRecurrenceRule({
      taskTemplateId: IDS.templateAnual,
      rule: {
        type: "anual",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: 25,
        month: 1,
        endDate: null,
      },
    });

    expect(result?.serverError).toBeUndefined();
    const nextRunAt = new Date(
      result?.data?.rule.nextRunAt as unknown as string,
    );
    expectCloseTo(
      nextRunAt,
      computeNextRun(
        {
          type: "anual",
          interval: 1,
          dayOfWeek: null,
          dayOfMonth: 25,
          month: 1,
        },
        from,
      ),
    );
    expect(nextRunAt.getUTCDate()).toBe(25);
    expect(nextRunAt.getUTCMonth()).toBe(0); // janeiro, não o mês de `from`
  });

  it("template inexistente: retorna erro e não cria a regra", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");
    const result = await createRecurrenceRule({
      taskTemplateId: "00000000-0000-0000-0000-000000000000",
      rule: {
        type: "diaria",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });
    expect(result?.serverError).toBeDefined();
  });
});

describe("updateRecurrenceRule — recalcula next_run_at", () => {
  it("editar o tipo da regra recalcula next_run_at para o novo padrão", async () => {
    const { createRecurrenceRule, updateRecurrenceRule } =
      await import("../actions/recurrence");

    const created = await createRecurrenceRule({
      taskTemplateId: IDS.templateUpdate,
      rule: {
        type: "diaria",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });
    expect(created?.serverError).toBeUndefined();
    const ruleId = created?.data?.rule.id as unknown as string;

    const from = new Date();
    const updated = await updateRecurrenceRule({
      recurrenceRuleId: ruleId,
      rule: {
        type: "mensal",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: 10,
        endDate: null,
      },
    });

    expect(updated?.serverError).toBeUndefined();
    const nextRunAt = new Date(
      updated?.data?.rule.nextRunAt as unknown as string,
    );
    expectCloseTo(
      nextRunAt,
      computeNextRun(
        {
          type: "mensal",
          interval: 1,
          dayOfWeek: null,
          dayOfMonth: 10,
          month: null,
        },
        from,
      ),
    );
    expect(nextRunAt.getUTCDate()).toBe(10);
  });

  it("regra inexistente: retorna erro", async () => {
    const { updateRecurrenceRule } = await import("../actions/recurrence");
    const result = await updateRecurrenceRule({
      recurrenceRuleId: "00000000-0000-0000-0000-000000000000",
      rule: {
        type: "diaria",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });
    expect(result?.serverError).toBeDefined();
  });
});

describe("endRecurrenceRule — encerra sem depender do template", () => {
  it("grava end_date = agora numa regra existente", async () => {
    const { createRecurrenceRule, endRecurrenceRule } =
      await import("../actions/recurrence");

    const created = await createRecurrenceRule({
      taskTemplateId: IDS.templateEnd,
      rule: {
        type: "diaria",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });
    expect(created?.serverError).toBeUndefined();
    const ruleId = created?.data?.rule.id as unknown as string;

    const ended = await endRecurrenceRule({ recurrenceRuleId: ruleId });
    expect(ended?.serverError).toBeUndefined();
    const endDate = new Date(ended?.data?.rule.endDate as unknown as string);
    expectCloseTo(endDate, new Date());
  });

  it("regra inexistente: retorna erro", async () => {
    const { endRecurrenceRule } = await import("../actions/recurrence");
    const result = await endRecurrenceRule({
      recurrenceRuleId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result?.serverError).toBeDefined();
  });
});

describe("guarda: uma regra ativa por template (P-4.9d)", () => {
  it("createRecurrenceRule recusa uma segunda regra ativa para o mesmo template", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");

    const first = await createRecurrenceRule({
      taskTemplateId: IDS.templateGuardCreate,
      rule: {
        type: "diaria",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });
    expect(first?.serverError).toBeUndefined();

    const second = await createRecurrenceRule({
      taskTemplateId: IDS.templateGuardCreate,
      rule: {
        type: "semanal",
        interval: 1,
        dayOfWeek: 2,
        dayOfMonth: null,
        endDate: null,
      },
    });
    // apps/tarefas/src/lib/safe-action.ts não define handleServerError, então
    // o serverError aqui é sempre a mensagem genérica do next-safe-action
    // (mesma convenção documentada em time-tracking.test.ts) — a mensagem em
    // português de assertNoOtherActiveRule é a que a tela mostraria via
    // useAction, não algo que este teste consiga inspecionar diretamente.
    expect(second?.serverError).toBeDefined();
  });

  it("updateRecurrenceRule recusa reativar uma regra encerrada enquanto outra segue ativa no mesmo template", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");

    // Regra ativa "de verdade" no template (via action, para não pular a
    // guarda que estamos testando).
    const active = await createRecurrenceRule({
      taskTemplateId: IDS.templateGuardUpdate,
      rule: {
        type: "diaria",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });
    expect(active?.serverError).toBeUndefined();

    // Segunda regra, já encerrada no passado, inserida direto no banco —
    // representa uma regra histórica que só existe porque a guarda
    // (migration 0077) não existia antes de P-4.9d.
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const [endedRow] = await db
      .insert(recurrenceRules)
      .values({
        taskTemplateId: IDS.templateGuardUpdate,
        type: "diaria",
        interval: 1,
        endDate: yesterday,
        nextRunAt: null,
      })
      .returning();
    expect(endedRow).toBeDefined();

    const { updateRecurrenceRule } = await import("../actions/recurrence");
    const reactivated = await updateRecurrenceRule({
      recurrenceRuleId: (endedRow as { id: string }).id,
      rule: {
        type: "diaria",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: null,
        endDate: null,
      },
    });
    expect(reactivated?.serverError).toBeDefined();
  });

  it("banco: índice único parcial rejeita um segundo INSERT sem end_date, mesmo por fora da action", async () => {
    await db.insert(recurrenceRules).values({
      taskTemplateId: IDS.templateGuardIndex,
      type: "diaria",
      interval: 1,
      endDate: null,
    });

    await expect(
      db.insert(recurrenceRules).values({
        taskTemplateId: IDS.templateGuardIndex,
        type: "semanal",
        interval: 1,
        dayOfWeek: 3,
        endDate: null,
      }),
    ).rejects.toThrow();
  });
});
