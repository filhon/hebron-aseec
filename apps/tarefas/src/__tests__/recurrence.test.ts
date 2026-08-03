/**
 * recurrence.test.ts — regras de recorrência (P-4.8: actions/recurrence.ts)
 *
 * Cobre createRecurrenceRule/updateRecurrenceRule contra o banco real:
 * persistência do campo `month`, resolução de template e o encaixe da
 * regra com o cálculo de next_run_at. Usa o relógio real (sem
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
 * real da próxima tarefa a partir de next_run_at é responsabilidade do cron
 * registrado em packages/jobs/src/crons/tarefas.ts (runTarefasRecurrence),
 * sem suíte própria neste monorepo.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  workspaces,
  taskTemplates,
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
  template: "eb110000-0000-0000-0000-000000000001",
};

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
    .values({
      id: IDS.template,
      name: "Template Recorrência Teste",
      workspaceId,
      createdBy: IDS.actor,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(taskTemplates).where(eq(taskTemplates.id, IDS.template));
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, IDS.actor));
  await db.delete(users).where(eq(users.id, IDS.actor));
});

describe("createRecurrenceRule — computeNextRun por tipo", () => {
  it("diária: soma interval dias a partir de agora", async () => {
    const { createRecurrenceRule } = await import("../actions/recurrence");
    const from = new Date();
    const result = await createRecurrenceRule({
      taskTemplateId: IDS.template,
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
      taskTemplateId: IDS.template,
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
      taskTemplateId: IDS.template,
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
      taskTemplateId: IDS.template,
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
      taskTemplateId: IDS.template,
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
});
