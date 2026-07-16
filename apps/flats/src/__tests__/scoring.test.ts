/**
 * scoring.test.ts — computeScoringResponses (actions/scoring.ts, P-7.8/P-7.9)
 * e breakTie (lib/tie-break.ts, P-7.9).
 *
 * Coberturas (critérios de aceite P-7.12):
 *  - Scoring: os 10 critérios (a-j) somam corretamente. SCORING_MAX_POINTS é
 *    75, não 80 — a divergência do cabeçalho do BRAIN §6.8 já foi confirmada
 *    com Filipe e corrigida em packages/types/src/flats/index.ts (S-121).
 *  - Desempate: ordem correta (idade → tempo sem descanso fora da cidade →
 *    nunca usou o flat → sorteio).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  usageHistory,
  projects,
  reservations,
} from "@hebron/db/schema";
import {
  computeScoringResponses,
  SCORING_MAX_POINTS,
  type ScoringAnswersInput,
} from "../actions/scoring";
import { breakTie, type TieBreakCandidate } from "../lib/tie-break";

const IDS = {
  users: {
    noHistory: "f7130000-0000-0000-0000-000000000001",
    oldStay: "f7130000-0000-0000-0000-000000000002",
    recentStay: "f7130000-0000-0000-0000-000000000003",
    participant: "f7130000-0000-0000-0000-000000000004",
    nonParticipant: "f7130000-0000-0000-0000-000000000005",
  },
  project: "f7131000-0000-0000-0000-000000000001",
  reservations: {
    oldStay: "f7132000-0000-0000-0000-000000000001",
    recentStay: "f7132000-0000-0000-0000-000000000002",
  },
} as const;

const BASE_ANSWERS: ScoringAnswersInput = {
  usageFrequency: "nunca",
  ministryLocation: "centro",
  healthDeclared: false,
  specialFamilySituation: null,
  lastRestOutsideCity: "menos_de_1_ano",
  ministryIntensity: "baixa",
  hasRecommendationLetter: false,
  supportType: "autossustentado",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  await db
    .insert(users)
    .values(
      Object.values(IDS.users).map((id) => ({
        id,
        email: `${id}@test.hebron`,
        fullName: `Scoring Test ${id}`,
      })),
    )
    .onConflictDoNothing();

  for (const id of Object.values(IDS.users)) {
    await db
      .insert(roleAssignments)
      .values({ userId: id, role: "hospede", grantedBy: id })
      .onConflictDoNothing();
  }

  await db
    .insert(reservations)
    .values([
      {
        id: IDS.reservations.oldStay,
        requestedBy: IDS.users.oldStay,
        purpose: "Scoring test — b) estadia antiga",
        status: "concluida",
      },
      {
        id: IDS.reservations.recentStay,
        requestedBy: IDS.users.recentStay,
        purpose: "Scoring test — b) estadia recente",
        status: "concluida",
      },
    ])
    .onConflictDoNothing();

  function isoDate(date: Date): string {
    const iso = date.toISOString().split("T")[0];
    if (!iso) throw new Error("Data inválida");
    return iso;
  }

  // recentStay: última estadia há 2 meses (< 12 meses → 0 pontos).
  const recentEnd = new Date(Date.now() - 60 * MS_PER_DAY);
  const recentStart = new Date(recentEnd.getTime() - 5 * MS_PER_DAY);

  // oldStay: última estadia há 18 meses (>= 12 meses → 5 pontos).
  const oldEnd = new Date(Date.now() - 18 * 30 * MS_PER_DAY);
  const oldStart = new Date(oldEnd.getTime() - 5 * MS_PER_DAY);

  await db.insert(usageHistory).values([
    {
      userId: IDS.users.recentStay,
      reservationId: IDS.reservations.recentStay,
      daysUsed: 5,
      period: { start: isoDate(recentStart), end: isoDate(recentEnd) },
    },
    {
      userId: IDS.users.oldStay,
      reservationId: IDS.reservations.oldStay,
      daysUsed: 5,
      period: { start: isoDate(oldStart), end: isoDate(oldEnd) },
    },
  ]);

  // participant tem projeto aprovado durante toda a suíte — critério j
  // (participação em projetos) fica fixo em 5 pontos para este usuário,
  // usado tanto no teste de soma máxima quanto no teste dedicado ao critério j.
  await db
    .insert(projects)
    .values({
      id: IDS.project,
      title: "Projeto de teste — scoring j",
      tipo: "pontual",
      stage: "aprovado",
      submitterId: IDS.users.participant,
      budgetTotal: "1000.00",
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(usageHistory)
    .where(inArray(usageHistory.userId, Object.values(IDS.users)));
  await db
    .delete(reservations)
    .where(inArray(reservations.id, Object.values(IDS.reservations)));
  await db.delete(projects).where(eq(projects.id, IDS.project));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("computeScoringResponses — 10 critérios somam corretamente", () => {
  it("todas as respostas no ponto máximo somam SCORING_MAX_POINTS (75)", async () => {
    expect(SCORING_MAX_POINTS).toBe(75);

    const { responses, totalPoints } = await withAuthenticatedContext(
      { actorId: IDS.users.participant },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.participant,
          ministryStartDate: new Date(Date.now() - 20 * 365.25 * MS_PER_DAY),
          answers: {
            ...BASE_ANSWERS,
            ministryLocation: "remota",
            healthDeclared: true,
            specialFamilySituation: "Filho com necessidades especiais",
            lastRestOutsideCity: "mais_de_2_anos",
            ministryIntensity: "alta",
            hasRecommendationLetter: true,
            supportType: "dependente",
          },
        }),
    );

    expect(responses).toHaveLength(10);
    const sum = responses.reduce((acc, r) => acc + r.points, 0);
    expect(sum).toBe(totalPoints);
    // a(10) + b(10, sem histórico) + c(10) + d(5) + e(5) + f(10) + g(10) +
    // h(5) + i(5) + j(5, projeto aprovado) = 75 = SCORING_MAX_POINTS
    expect(totalPoints).toBe(SCORING_MAX_POINTS);
  });

  it("todas as respostas no ponto mínimo somam 0", async () => {
    // Usa recentStay (não nonParticipant): o critério b) é calculado a
    // partir de flats.usage_history, não da resposta "usageFrequency" do
    // formulário — um usuário sem NENHUM histórico pontua 10 em b (== nunca
    // usou), então "ponto mínimo" exige um histórico recente de verdade.
    const { totalPoints } = await withAuthenticatedContext(
      { actorId: IDS.users.recentStay },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.recentStay,
          ministryStartDate: new Date(),
          answers: BASE_ANSWERS,
        }),
    );

    expect(totalPoints).toBe(0);
  });
});

describe("computeScoringResponses — critério a) tempo de ministério (1pt/ano, máx. 10)", () => {
  it("3 anos de ministério → 3 pontos", async () => {
    const { responses } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(Date.now() - 3 * 365.25 * MS_PER_DAY),
          answers: BASE_ANSWERS,
        }),
    );
    const a = responses.find((r) => r.criterion === "a_tempo_ministerio");
    expect(a?.points).toBe(3);
  });

  it("15 anos de ministério → clampado em 10 pontos (máximo do critério)", async () => {
    const { responses } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(Date.now() - 15 * 365.25 * MS_PER_DAY),
          answers: BASE_ANSWERS,
        }),
    );
    const a = responses.find((r) => r.criterion === "a_tempo_ministerio");
    expect(a?.points).toBe(10);
  });
});

describe("computeScoringResponses — critério b) frequência de uso (de flats.usage_history, não autodeclarada)", () => {
  it("sem histórico → 'nunca', 10 pontos", async () => {
    const { responses } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(),
          answers: BASE_ANSWERS,
        }),
    );
    const b = responses.find((r) => r.criterion === "b_frequencia_uso");
    expect(b?.points).toBe(10);
    expect(b?.value).toBe("nunca");
  });

  it("última estadia há ≥12 meses → 5 pontos", async () => {
    const { responses } = await withAuthenticatedContext(
      { actorId: IDS.users.oldStay },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.oldStay,
          ministryStartDate: new Date(),
          answers: BASE_ANSWERS,
        }),
    );
    const b = responses.find((r) => r.criterion === "b_frequencia_uso");
    expect(b?.points).toBe(5);
    expect(b?.value).toBe("mais_de_1_ano");
  });

  it("última estadia há <12 meses → 0 pontos", async () => {
    const { responses } = await withAuthenticatedContext(
      { actorId: IDS.users.recentStay },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.recentStay,
          ministryStartDate: new Date(),
          answers: BASE_ANSWERS,
        }),
    );
    const b = responses.find((r) => r.criterion === "b_frequencia_uso");
    expect(b?.points).toBe(0);
    expect(b?.value).toBe("menos_de_12_meses");
  });
});

describe("computeScoringResponses — critérios c, e, f, g, h, i (respostas diretas do formulário)", () => {
  it("c) localização: remota=10, periferia=5, centro=0", async () => {
    for (const [location, expected] of [
      ["remota", 10],
      ["periferia", 5],
      ["centro", 0],
    ] as const) {
      const { responses } = await withAuthenticatedContext(
        { actorId: IDS.users.noHistory },
        (tx) =>
          computeScoringResponses({
            tx,
            userId: IDS.users.noHistory,
            ministryStartDate: new Date(),
            answers: { ...BASE_ANSWERS, ministryLocation: location },
          }),
      );
      const c = responses.find((r) => r.criterion === "c_localizacao");
      expect(c?.points).toBe(expected);
    }
  });

  it("e) situação familiar especial: texto não vazio=5, vazio/null=0", async () => {
    const { responses: withText } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(),
          answers: {
            ...BASE_ANSWERS,
            specialFamilySituation: "Situação relevante",
          },
        }),
    );
    expect(
      withText.find((r) => r.criterion === "e_situacao_familiar")?.points,
    ).toBe(5);

    const { responses: withoutText } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(),
          answers: { ...BASE_ANSWERS, specialFamilySituation: null },
        }),
    );
    expect(
      withoutText.find((r) => r.criterion === "e_situacao_familiar")?.points,
    ).toBe(0);
  });

  it("f) último descanso fora da cidade: mais_de_2_anos=10, entre_1_e_2_anos=5, menos_de_1_ano=0", async () => {
    for (const [rest, expected] of [
      ["mais_de_2_anos", 10],
      ["entre_1_e_2_anos", 5],
      ["menos_de_1_ano", 0],
    ] as const) {
      const { responses } = await withAuthenticatedContext(
        { actorId: IDS.users.noHistory },
        (tx) =>
          computeScoringResponses({
            tx,
            userId: IDS.users.noHistory,
            ministryStartDate: new Date(),
            answers: { ...BASE_ANSWERS, lastRestOutsideCity: rest },
          }),
      );
      const f = responses.find((r) => r.criterion === "f_ultimo_descanso");
      expect(f?.points).toBe(expected);
    }
  });

  it("g) intensidade ministerial: alta=10, media=5, baixa=0", async () => {
    for (const [intensity, expected] of [
      ["alta", 10],
      ["media", 5],
      ["baixa", 0],
    ] as const) {
      const { responses } = await withAuthenticatedContext(
        { actorId: IDS.users.noHistory },
        (tx) =>
          computeScoringResponses({
            tx,
            userId: IDS.users.noHistory,
            ministryStartDate: new Date(),
            answers: { ...BASE_ANSWERS, ministryIntensity: intensity },
          }),
      );
      const g = responses.find(
        (r) => r.criterion === "g_intensidade_ministerial",
      );
      expect(g?.points).toBe(expected);
    }
  });

  it("h) carta de recomendação: sim=5, não=0", async () => {
    const { responses: withLetter } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(),
          answers: { ...BASE_ANSWERS, hasRecommendationLetter: true },
        }),
    );
    expect(
      withLetter.find((r) => r.criterion === "h_carta_recomendacao")?.points,
    ).toBe(5);

    const { responses: withoutLetter } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(),
          answers: { ...BASE_ANSWERS, hasRecommendationLetter: false },
        }),
    );
    expect(
      withoutLetter.find((r) => r.criterion === "h_carta_recomendacao")?.points,
    ).toBe(0);
  });

  it("i) tipo de sustento: dependente=5, parcial=3, autossustentado=0", async () => {
    for (const [support, expected] of [
      ["dependente", 5],
      ["parcial", 3],
      ["autossustentado", 0],
    ] as const) {
      const { responses } = await withAuthenticatedContext(
        { actorId: IDS.users.noHistory },
        (tx) =>
          computeScoringResponses({
            tx,
            userId: IDS.users.noHistory,
            ministryStartDate: new Date(),
            answers: { ...BASE_ANSWERS, supportType: support },
          }),
      );
      const i = responses.find((r) => r.criterion === "i_tipo_sustento");
      expect(i?.points).toBe(expected);
    }
  });

  it("d) saúde: resposta true=5, false=0 (gating por consentimento é responsabilidade da Server Action, não deste cálculo)", async () => {
    const { responses: declared } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(),
          answers: { ...BASE_ANSWERS, healthDeclared: true },
        }),
    );
    expect(declared.find((r) => r.criterion === "d_saude")?.points).toBe(5);
    expect(
      declared.find((r) => r.criterion === "d_saude")?.healthSelfDeclared,
    ).toBe(true);

    const { responses: notDeclared } = await withAuthenticatedContext(
      { actorId: IDS.users.noHistory },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.noHistory,
          ministryStartDate: new Date(),
          answers: { ...BASE_ANSWERS, healthDeclared: false },
        }),
    );
    expect(notDeclared.find((r) => r.criterion === "d_saude")?.points).toBe(0);
  });
});

describe("computeScoringResponses — critério j) participação em projetos (Projetos → Flats)", () => {
  it("usuário com projeto aprovado → 5 pontos", async () => {
    const { responses } = await withAuthenticatedContext(
      { actorId: IDS.users.participant },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.participant,
          ministryStartDate: new Date(),
          answers: BASE_ANSWERS,
        }),
    );
    const j = responses.find((r) => r.criterion === "j_participacao_projetos");
    expect(j?.points).toBe(5);
    expect(j?.value).toBe("sim");
  });

  it("usuário sem projetos → 0 pontos", async () => {
    const { responses } = await withAuthenticatedContext(
      { actorId: IDS.users.nonParticipant },
      (tx) =>
        computeScoringResponses({
          tx,
          userId: IDS.users.nonParticipant,
          ministryStartDate: new Date(),
          answers: BASE_ANSWERS,
        }),
    );
    const j = responses.find((r) => r.criterion === "j_participacao_projetos");
    expect(j?.points).toBe(0);
    expect(j?.value).toBe("nao");
  });
});

// ── breakTie — desempate (BRAIN §6.8, lib/tie-break.ts) ────────────────────

function candidate(overrides: Partial<TieBreakCandidate>): TieBreakCandidate {
  return {
    reservationId: "r",
    birthDate: new Date("1980-01-01"),
    lastRestOutsideCity: "menos_de_1_ano",
    neverUsedFlat: false,
    ...overrides,
  };
}

describe("breakTie — ordem de desempate: idade → tempo sem descanso → nunca usou → sorteio", () => {
  it("lista vazia → null", () => {
    expect(breakTie([])).toBeNull();
  });

  it("1 candidato → o próprio candidato", () => {
    const only = candidate({ reservationId: "a" });
    expect(breakTie([only])).toBe(only);
  });

  it("1) idade: o mais velho (menor birthDate) vence", () => {
    const oldest = candidate({
      reservationId: "oldest",
      birthDate: new Date("1950-01-01"),
    });
    const youngest = candidate({
      reservationId: "youngest",
      birthDate: new Date("1995-01-01"),
    });
    expect(breakTie([youngest, oldest])?.reservationId).toBe("oldest");
  });

  it("2) empate de idade: mais tempo sem descanso fora da cidade vence", () => {
    const sameBirth = new Date("1980-01-01");
    const longRest = candidate({
      reservationId: "long-rest",
      birthDate: sameBirth,
      lastRestOutsideCity: "mais_de_2_anos",
    });
    const shortRest = candidate({
      reservationId: "short-rest",
      birthDate: sameBirth,
      lastRestOutsideCity: "menos_de_1_ano",
    });
    expect(breakTie([shortRest, longRest])?.reservationId).toBe("long-rest");
  });

  it("3) empate de idade e descanso: quem nunca usou o flat vence", () => {
    const sameBirth = new Date("1980-01-01");
    const neverUsed = candidate({
      reservationId: "never-used",
      birthDate: sameBirth,
      lastRestOutsideCity: "mais_de_2_anos",
      neverUsedFlat: true,
    });
    const alreadyUsed = candidate({
      reservationId: "already-used",
      birthDate: sameBirth,
      lastRestOutsideCity: "mais_de_2_anos",
      neverUsedFlat: false,
    });
    expect(breakTie([alreadyUsed, neverUsed])?.reservationId).toBe(
      "never-used",
    );
  });

  it("4) empate total: sorteio — vencedor pertence ao grupo empatado", () => {
    const sameBirth = new Date("1980-01-01");
    const pool = [
      candidate({
        reservationId: "x",
        birthDate: sameBirth,
        lastRestOutsideCity: "mais_de_2_anos",
        neverUsedFlat: true,
      }),
      candidate({
        reservationId: "y",
        birthDate: sameBirth,
        lastRestOutsideCity: "mais_de_2_anos",
        neverUsedFlat: true,
      }),
    ];
    const winner = breakTie(pool);
    expect(pool.map((c) => c.reservationId)).toContain(winner?.reservationId);
  });
});
