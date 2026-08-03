/**
 * tarefas-recurrence.test.ts — computeNextRun (P-4.1b)
 *
 * Puro: sem banco, sem relógio falso (vi.useFakeTimers/setSystemTime) — só a
 * função exportada de ../tarefas, com datas fixas passadas como `from`. É a
 * única cópia de computeNextRun no monorepo (apps/tarefas/src/actions/
 * recurrence.ts e packages/jobs/src/crons/tarefas.ts importam daqui), então
 * este teste cobre as duas execuções (criação de regra e cron) de uma vez.
 */
import { describe, it, expect } from "vitest";
import { computeNextRun } from "../tarefas";

describe("computeNextRun — diária", () => {
  it("soma interval dias a partir de `from`", () => {
    const from = new Date("2026-03-10T12:00:00Z");
    const next = computeNextRun(
      {
        type: "diaria",
        interval: 3,
        dayOfWeek: null,
        dayOfMonth: null,
        month: null,
      },
      from,
    );
    expect(next.toISOString()).toBe("2026-03-13T12:00:00.000Z");
  });
});

describe("computeNextRun — semanal", () => {
  it("avança para o próximo dia da semana configurado", () => {
    // 2026-03-10 é uma terça-feira (dia 2).
    const from = new Date("2026-03-10T12:00:00Z");
    const next = computeNextRun(
      {
        type: "semanal",
        interval: 1,
        dayOfWeek: 5,
        dayOfMonth: null,
        month: null,
      },
      from,
    );
    expect(next.getUTCDay()).toBe(5);
    expect(next.toISOString()).toBe("2026-03-13T12:00:00.000Z");
  });

  it("intervalo > 1 pula semanas inteiras", () => {
    const from = new Date("2026-03-10T12:00:00Z"); // terça
    const next = computeNextRun(
      {
        type: "semanal",
        interval: 2,
        dayOfWeek: 5,
        dayOfMonth: null,
        month: null,
      },
      from,
    );
    // Próxima sexta (13/03) + 1 semana (interval - 1 = 1).
    expect(next.toISOString()).toBe("2026-03-20T12:00:00.000Z");
  });
});

describe("computeNextRun — mensal", () => {
  it("31/01 mensal nunca pula fevereiro nem avança direto para março", () => {
    const from = new Date("2026-01-31T09:00:00Z");
    const next = computeNextRun(
      {
        type: "mensal",
        interval: 1,
        dayOfWeek: null,
        dayOfMonth: 31,
        month: null,
      },
      from,
    );
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(1); // fevereiro
    expect(next.getUTCDate()).toBe(28); // 2026 não é bissexto
  });

  it("dia 31 ancorado não pula nenhum mês ao longo de 12 execuções consecutivas", () => {
    let from = new Date("2026-01-31T09:00:00Z");
    const monthsSeen: number[] = [];
    for (let i = 0; i < 12; i++) {
      const next = computeNextRun(
        {
          type: "mensal",
          interval: 1,
          dayOfWeek: null,
          dayOfMonth: 31,
          month: null,
        },
        from,
      );
      monthsSeen.push(next.getUTCMonth());
      from = next;
    }
    // Fevereiro (2026, não bissexto) até janeiro do ano seguinte — cada um
    // dos 12 meses aparece exatamente uma vez, nenhum repetido, nenhum pulado.
    expect(monthsSeen).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]);
    expect(new Set(monthsSeen).size).toBe(12);
  });

  it("respeita interval > 1 mantendo o dia ancorado", () => {
    const from = new Date("2026-01-15T09:00:00Z");
    const next = computeNextRun(
      {
        type: "mensal",
        interval: 2,
        dayOfWeek: null,
        dayOfMonth: 15,
        month: null,
      },
      from,
    );
    expect(next.toISOString()).toBe("2026-03-15T09:00:00.000Z");
  });
});

describe("computeNextRun — anual", () => {
  it("o IPTU de janeiro calculado a partir de julho cai em 10 de janeiro", () => {
    const from = new Date("2026-07-15T00:00:00Z");
    const next = computeNextRun(
      { type: "anual", interval: 1, dayOfWeek: null, dayOfMonth: 10, month: 1 },
      from,
    );
    expect(next.getUTCMonth()).toBe(0); // janeiro
    expect(next.getUTCDate()).toBe(10);
    expect(next.getUTCFullYear()).toBe(2027); // 10/jan já passou em 2026
  });

  it("data ainda não passada no ano corrente usa o ano corrente", () => {
    const from = new Date("2026-01-05T00:00:00Z");
    const next = computeNextRun(
      { type: "anual", interval: 1, dayOfWeek: null, dayOfMonth: 10, month: 1 },
      from,
    );
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(0);
    expect(next.getUTCDate()).toBe(10);
  });

  it("29/02 cai no último dia de fevereiro em ano não bissexto", () => {
    const from = new Date("2026-06-01T00:00:00Z"); // 2026 não é bissexto
    const next = computeNextRun(
      { type: "anual", interval: 1, dayOfWeek: null, dayOfMonth: 29, month: 2 },
      from,
    );
    expect(next.getUTCFullYear()).toBe(2027);
    expect(next.getUTCMonth()).toBe(1); // fevereiro
    expect(next.getUTCDate()).toBe(28);
  });

  it("respeita interval > 1 anos a partir do ano corrente quando a data já passou", () => {
    const from = new Date("2026-12-30T00:00:00Z"); // 25/dez já passou
    const next = computeNextRun(
      {
        type: "anual",
        interval: 3,
        dayOfWeek: null,
        dayOfMonth: 25,
        month: 12,
      },
      from,
    );
    expect(next.getUTCFullYear()).toBe(2029);
    expect(next.getUTCMonth()).toBe(11); // dezembro
    expect(next.getUTCDate()).toBe(25);
  });
});
