/**
 * reservations.test.ts — Server Actions do ciclo de vida da reserva
 * (actions/reservations.ts, actions/approval.ts, actions/checkin.ts,
 * actions/aid.ts), P-7.8/P-7.9/P-7.12.
 *
 * Roda contra o banco real (postgres.js via @hebron/db/client), com
 * `resolveSession` mockado (mesmo padrão de
 * apps/financeiro/src/__tests__/audit-abort.test.ts) para simular cada ator.
 * As Server Actions chamam `withAuthenticatedContext`/RLS de verdade — os
 * papéis/designations usados no mock de sessão (gate JS) são espelhados por
 * linhas reais em public.role_assignments/public.designations quando o
 * fluxo depende da RLS (aprovar/check-in/check-out), mesmo racional do
 * comentário em audit-abort.test.ts.
 *
 * Coberturas (critérios de aceite P-7.12):
 *  - Consentimento: reserva sem "dados_reserva" não persiste; campo saúde
 *    exige "dado_saude" específico.
 *  - Elegibilidade: diretor/conselheiro (mesmo com papel hospede também)
 *    nunca criam reserva.
 *  - Regra 7d/12 meses: reserva que excede o limite é bloqueada.
 *  - Double-booking: duas aprovações no mesmo flat/período retornam erro.
 *  - Fluxo completo: submeter → aprovar → confirmar → check-in → check-out.
 *  - Auxílio: payable nasce "pendente" (não aprovado) — governança dual (D-4).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  consents,
  reservations,
  preferredPeriods,
  flatsGuests as guests,
  documentFiles,
  aidRequests,
  usageHistory,
  scoringResponses,
  payables,
  auditLog,
} from "@hebron/db/schema";
import type { CreateReservationRequestInput } from "@hebron/validators/flats";

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

let currentSession = {
  actorId: "",
  roles: [] as string[],
  designations: [] as string[],
};

vi.mock("@hebron/auth/server", () => ({
  resolveSession: vi.fn(async () => currentSession),
}));

function asActor(actorId: string, roles: string[], desig: string[] = []) {
  currentSession = { actorId, roles, designations: desig };
}

function requireDefined<T>(value: T | undefined | null, label = "value"): T {
  if (value == null) throw new Error(`Expected ${label} to be defined`);
  return value;
}

function isoDateOnly(date: Date): string {
  return requireDefined(date.toISOString().split("T")[0], "isoDate");
}

/**
 * `reviewReservation` compara o `confirmedPeriod` recebido contra as linhas
 * de `preferred_periods` lidas do banco — usamos uma leitura real da tabela
 * (em vez do literal original passado a `createReservation`) para exercitar
 * o mesmo caminho de dados que o formulário de aprovação usa em produção.
 * Desde a correção de `daterange.fromDriver` (P-7.6b), esse valor lido bate
 * exatamente com o literal informado — sem deslocamento de canonicalização.
 */
async function fetchStoredPeriod(
  reservationId: string,
  rank: number,
): Promise<{ start: Date; end: Date }> {
  const rows = await db
    .select({ rank: preferredPeriods.rank, period: preferredPeriods.period })
    .from(preferredPeriods)
    .where(eq(preferredPeriods.reservationId, reservationId));
  const match = requireDefined(
    rows.find((r) => r.rank === rank),
    `preferredPeriod rank=${rank} for reservation ${reservationId}`,
  );
  return {
    start: new Date(`${match.period.start}T00:00:00Z`),
    end: new Date(`${match.period.end}T00:00:00Z`),
  };
}

// ── Fixtures ────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const IDS = {
  users: {
    consentNone: "f7140000-0000-0000-0000-000000000001",
    consentNoHealth: "f7140000-0000-0000-0000-000000000002",
    consentWithHealth: "f7140000-0000-0000-0000-000000000003",
    diretorHospede: "f7140000-0000-0000-0000-000000000004",
    conselheiroHospede: "f7140000-0000-0000-0000-000000000005",
    limitOver: "f7140000-0000-0000-0000-000000000006",
    limitUnder: "f7140000-0000-0000-0000-000000000007",
    dbA: "f7140000-0000-0000-0000-000000000008",
    dbB: "f7140000-0000-0000-0000-000000000009",
    flow: "f7140000-0000-0000-0000-00000000000a",
    aid: "f7140000-0000-0000-0000-00000000000b",
    gestor: "f7140000-0000-0000-0000-00000000000c",
    documentUpload: "f7140000-0000-0000-0000-00000000000d",
  },
  seedReservations: {
    limitOver: "f7141000-0000-0000-0000-000000000001",
    limitUnder: "f7141000-0000-0000-0000-000000000002",
  },
} as const;

// Unidades fixas seedadas em 0021_flats.sql — nunca criadas por este teste.
const UNIT_1 = "00000000-0000-0000-0008-000000000001";
const UNIT_2 = "00000000-0000-0000-0008-000000000002";

const DEFAULT_SCORING_ANSWERS = {
  usageFrequency: "nunca" as const,
  ministryLocation: "centro" as const,
  healthDeclared: false,
  specialFamilySituation: null,
  lastRestOutsideCity: "menos_de_1_ano" as const,
  ministryIntensity: "baixa" as const,
  hasRecommendationLetter: false,
  supportType: "autossustentado" as const,
};

function period(daysFromNow: number, lengthDays = 3) {
  const start = new Date(Date.now() + daysFromNow * MS_PER_DAY);
  const end = new Date(start.getTime() + lengthDays * MS_PER_DAY);
  return { start, end };
}

function buildInput(
  overrides: Partial<CreateReservationRequestInput> = {},
): CreateReservationRequestInput {
  return {
    guest: {
      responsibleName: "Fulano de Tal da Silva",
      responsibleCpf: "12345678901",
      responsibleEmail: "fulano@test.hebron",
      responsiblePhone: "11999999999",
      responsibleBirthDate: new Date("1980-01-01"),
      responsibleDocument: null,
      ministryType: "pastor",
      ministryStartDate: new Date("2015-01-01"),
      companions: [],
      youngChildren: [],
    },
    preferredPeriods: [period(30), period(60), period(90)],
    purpose: "Descanso ministerial programado para renovação espiritual",
    arrivesByCar: false,
    vehicle: null,
    scoringAnswers: DEFAULT_SCORING_ANSWERS,
    aidRequest: null,
    ...overrides,
  };
}

const createdReservationIds: string[] = [];
const createdPayableIds: string[] = [];

async function grantConsent(
  userId: string,
  purpose: "dados_reserva" | "dado_saude",
) {
  await db
    .insert(consents)
    .values({ userId, purpose, granted: true, grantedAt: new Date() })
    .onConflictDoNothing();
}

beforeAll(async () => {
  const userIds = Object.values(IDS.users);
  await db
    .insert(users)
    .values(
      userIds.map((id) => ({
        id,
        email: `${id}@test.hebron`,
        fullName: `Reservations Test ${id}`,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values([
      { userId: IDS.users.consentNone, role: "hospede" },
      { userId: IDS.users.consentNoHealth, role: "hospede" },
      { userId: IDS.users.consentWithHealth, role: "hospede" },
      { userId: IDS.users.diretorHospede, role: "hospede" },
      { userId: IDS.users.diretorHospede, role: "diretor" },
      { userId: IDS.users.conselheiroHospede, role: "hospede" },
      { userId: IDS.users.conselheiroHospede, role: "conselheiro" },
      { userId: IDS.users.limitOver, role: "hospede" },
      { userId: IDS.users.limitUnder, role: "hospede" },
      { userId: IDS.users.dbA, role: "hospede" },
      { userId: IDS.users.dbB, role: "hospede" },
      { userId: IDS.users.flow, role: "hospede" },
      { userId: IDS.users.aid, role: "hospede" },
      { userId: IDS.users.gestor, role: "diretor" },
      { userId: IDS.users.documentUpload, role: "hospede" },
    ])
    .onConflictDoNothing();

  await db
    .insert(designations)
    .values({
      userId: IDS.users.gestor,
      type: "gestor",
      assignedBy: IDS.users.gestor,
    })
    .onConflictDoNothing();

  // dados_reserva concedido para todo mundo que efetivamente vai submeter
  // reserva, exceto consentNone (é o caso negativo do teste de consentimento).
  for (const id of [
    IDS.users.consentNoHealth,
    IDS.users.consentWithHealth,
    IDS.users.limitOver,
    IDS.users.limitUnder,
    IDS.users.dbA,
    IDS.users.dbB,
    IDS.users.flow,
    IDS.users.aid,
    IDS.users.documentUpload,
  ]) {
    await grantConsent(id, "dados_reserva");
  }
  await grantConsent(IDS.users.consentWithHealth, "dado_saude");

  // limitOver: 7 dias usados nos últimos 12 meses → bloqueia nova reserva.
  await db
    .insert(reservations)
    .values({
      id: IDS.seedReservations.limitOver,
      requestedBy: IDS.users.limitOver,
      purpose: "Seed — estadia concluída (limite 7d/12m)",
      status: "concluida",
    })
    .onConflictDoNothing();
  await db.insert(usageHistory).values({
    userId: IDS.users.limitOver,
    reservationId: IDS.seedReservations.limitOver,
    daysUsed: 7,
    period: {
      start: isoDateOnly(new Date(Date.now() - 30 * MS_PER_DAY)),
      end: isoDateOnly(new Date(Date.now() - 23 * MS_PER_DAY)),
    },
  });

  // limitUnder: 6 dias usados — abaixo do limite, controle positivo.
  await db
    .insert(reservations)
    .values({
      id: IDS.seedReservations.limitUnder,
      requestedBy: IDS.users.limitUnder,
      purpose: "Seed — estadia concluída (abaixo do limite)",
      status: "concluida",
    })
    .onConflictDoNothing();
  await db.insert(usageHistory).values({
    userId: IDS.users.limitUnder,
    reservationId: IDS.seedReservations.limitUnder,
    daysUsed: 6,
    period: {
      start: isoDateOnly(new Date(Date.now() - 30 * MS_PER_DAY)),
      end: isoDateOnly(new Date(Date.now() - 24 * MS_PER_DAY)),
    },
  });
});

afterAll(async () => {
  const allReservationIds = [
    ...createdReservationIds,
    ...Object.values(IDS.seedReservations),
  ];
  // Filtra por actorId, não por entityId: aid_requests grava audit com
  // entityId = aid_request.id (não a reserva), então um filtro por entidade
  // deixaria essas linhas órfãs e o DELETE de users abaixo bateria em
  // audit_log_actor_id_fkey (achado desta sessão — mesma classe de problema
  // documentada para outros pacotes, ex. system-actor.test.ts, S-133).
  await db
    .delete(auditLog)
    .where(inArray(auditLog.actorId, Object.values(IDS.users)));
  await db.delete(payables).where(inArray(payables.id, createdPayableIds));
  await db
    .delete(reservations)
    .where(inArray(reservations.id, allReservationIds));
  await db
    .delete(consents)
    .where(inArray(consents.userId, Object.values(IDS.users)));
  await db
    .delete(designations)
    .where(eq(designations.userId, IDS.users.gestor));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

// ── Consentimento (LGPD, P-0.13) ───────────────────────────────────────────

describe("createReservation — consentimento LGPD", () => {
  it("sem consentimento 'dados_reserva': reserva NÃO persiste", async () => {
    asActor(IDS.users.consentNone, ["hospede"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(buildInput());

    expect(result?.serverError).toBeDefined();

    const rows = await db
      .select()
      .from(reservations)
      .where(eq(reservations.requestedBy, IDS.users.consentNone));
    expect(rows).toHaveLength(0);
  });

  it("com 'dados_reserva' mas SEM 'dado_saude': campo saúde é zerado no servidor mesmo se o input pedir true", async () => {
    asActor(IDS.users.consentNoHealth, ["hospede"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(
      buildInput({
        scoringAnswers: { ...DEFAULT_SCORING_ANSWERS, healthDeclared: true },
      }),
    );

    expect(result?.serverError).toBeUndefined();
    const reservationId = requireDefined(
      result?.data?.reservationId,
      "reservationId",
    );
    createdReservationIds.push(reservationId);

    const rows = await db
      .select()
      .from(scoringResponses)
      .where(eq(scoringResponses.reservationId, reservationId));
    const d = rows.find((r) => r.criterion === "d_saude");
    expect(d?.points).toBe(0);
    expect(d?.healthSelfDeclared).toBe(false);
  });

  it("com 'dados_reserva' E 'dado_saude': campo saúde é considerado normalmente", async () => {
    asActor(IDS.users.consentWithHealth, ["hospede"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(
      buildInput({
        scoringAnswers: { ...DEFAULT_SCORING_ANSWERS, healthDeclared: true },
      }),
    );

    expect(result?.serverError).toBeUndefined();
    const reservationId = requireDefined(
      result?.data?.reservationId,
      "reservationId",
    );
    createdReservationIds.push(reservationId);

    const rows = await db
      .select()
      .from(scoringResponses)
      .where(eq(scoringResponses.reservationId, reservationId));
    const d = rows.find((r) => r.criterion === "d_saude");
    expect(d?.points).toBe(5);
    expect(d?.healthSelfDeclared).toBe(true);
  });
});

// ── Persistência do documento do responsável (P-7.9c, CORRETIVO) ───────────

describe("createReservation — persistência do documento do responsável (P-7.9c)", () => {
  it("reserva com documento anexado persiste 1 linha em flats.document_files vinculada ao guest responsável", async () => {
    asActor(IDS.users.documentUpload, ["hospede"]);
    const { createReservation } = await import("../actions/reservations");
    const baseInput = buildInput();
    const result = await createReservation({
      ...baseInput,
      guest: {
        ...baseInput.guest,
        responsibleDocument: {
          storageKey: `${IDS.users.documentUpload}/documento-teste.pdf`,
          fileName: "rg-responsavel.pdf",
          mimeType: "application/pdf",
          fileSizeBytes: 123456,
        },
      },
    });

    expect(result?.serverError).toBeUndefined();
    const reservationId = requireDefined(
      result?.data?.reservationId,
      "reservationId",
    );
    createdReservationIds.push(reservationId);

    const guestRows = await db
      .select()
      .from(guests)
      .where(eq(guests.reservationId, reservationId));
    const responsible = requireDefined(
      guestRows.find((g) => g.isResponsible),
      "responsible guest",
    );

    const docRows = await db
      .select()
      .from(documentFiles)
      .where(eq(documentFiles.reservationId, reservationId));
    expect(docRows).toHaveLength(1);
    expect(docRows[0]?.guestId).toBe(responsible.id);
    expect(docRows[0]?.uploadedBy).toBe(IDS.users.documentUpload);
    expect(docRows[0]?.storageKey).toBe(
      `${IDS.users.documentUpload}/documento-teste.pdf`,
    );
    expect(docRows[0]?.fileName).toBe("rg-responsavel.pdf");
  });

  it("reserva sem documento continua válida — nenhuma linha em document_files", async () => {
    asActor(IDS.users.dbA, ["hospede"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(
      buildInput({ preferredPeriods: [period(700), period(730), period(760)] }),
    );

    expect(result?.serverError).toBeUndefined();
    const reservationId = requireDefined(
      result?.data?.reservationId,
      "reservationId",
    );
    createdReservationIds.push(reservationId);

    const docRows = await db
      .select()
      .from(documentFiles)
      .where(eq(documentFiles.reservationId, reservationId));
    expect(docRows).toHaveLength(0);
  });
});

// ── Elegibilidade — diretor/conselheiro nunca reservam ─────────────────────

describe("createReservation — diretor/conselheiro NUNCA criam reserva (conflito de interesse)", () => {
  it("usuário com papéis hospede+diretor: bloqueado", async () => {
    asActor(IDS.users.diretorHospede, ["hospede", "diretor"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(buildInput());

    expect(result?.serverError).toBeDefined();
    const rows = await db
      .select()
      .from(reservations)
      .where(eq(reservations.requestedBy, IDS.users.diretorHospede));
    expect(rows).toHaveLength(0);
  });

  it("usuário com papéis hospede+conselheiro: bloqueado", async () => {
    asActor(IDS.users.conselheiroHospede, ["hospede", "conselheiro"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(buildInput());

    expect(result?.serverError).toBeDefined();
    const rows = await db
      .select()
      .from(reservations)
      .where(eq(reservations.requestedBy, IDS.users.conselheiroHospede));
    expect(rows).toHaveLength(0);
  });
});

// ── Regra 7 dias / 12 meses ─────────────────────────────────────────────

describe("createReservation — limite de 7 dias por 12 meses por indivíduo", () => {
  it("usuário com 7 dias já usados nos últimos 12 meses: bloqueado", async () => {
    asActor(IDS.users.limitOver, ["hospede"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(buildInput());

    expect(result?.serverError).toBeDefined();
    const rows = await db
      .select()
      .from(reservations)
      .where(eq(reservations.requestedBy, IDS.users.limitOver));
    // só a reserva-seed (já concluída) deve existir — nenhuma nova foi criada
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("concluida");
  });

  it("controle: usuário com 6 dias usados (abaixo do limite): permitido", async () => {
    asActor(IDS.users.limitUnder, ["hospede"]);
    const { createReservation } = await import("../actions/reservations");
    const result = await createReservation(buildInput());

    expect(result?.serverError).toBeUndefined();
    const reservationId = result?.data?.reservationId;
    if (reservationId) createdReservationIds.push(reservationId);
  });
});

// ── Double-booking ──────────────────────────────────────────────────────

describe("reviewReservation — double-booking: duas aprovações no mesmo flat/período", () => {
  const sharedPeriod = period(500, 3);

  it("segunda aprovação no mesmo flat/período retorna erro de conflito", async () => {
    const { createReservation } = await import("../actions/reservations");
    const { reviewReservation } = await import("../actions/approval");

    asActor(IDS.users.dbA, ["hospede"]);
    const first = await createReservation(
      buildInput({
        preferredPeriods: [sharedPeriod, period(560), period(590)],
      }),
    );
    expect(first?.serverError).toBeUndefined();
    const firstId = requireDefined(first?.data?.reservationId, "firstId");
    createdReservationIds.push(firstId);

    asActor(IDS.users.dbB, ["hospede"]);
    const second = await createReservation(
      buildInput({
        preferredPeriods: [sharedPeriod, period(561), period(591)],
      }),
    );
    expect(second?.serverError).toBeUndefined();
    const secondId = requireDefined(second?.data?.reservationId, "secondId");
    createdReservationIds.push(secondId);

    asActor(IDS.users.gestor, ["diretor"], ["gestor"]);
    const approveFirst = await reviewReservation({
      reservationId: firstId,
      decision: "aprovada",
      unitId: UNIT_1,
      confirmedPeriod: await fetchStoredPeriod(firstId, 1),
      managerNotes: null,
    });
    expect(approveFirst?.serverError).toBeUndefined();

    const approveSecond = await reviewReservation({
      reservationId: secondId,
      decision: "aprovada",
      unitId: UNIT_1,
      confirmedPeriod: await fetchStoredPeriod(secondId, 1),
      managerNotes: null,
    });
    expect(approveSecond?.serverError).toBeDefined();

    const [secondReservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, secondId));
    expect(secondReservation?.status).toBe("solicitada");
  });
});

// ── Fluxo completo: submeter → aprovar → confirmar → check-in → check-out ──

describe("Fluxo completo da reserva", () => {
  it("submeter → aprovar → confirmar → check-in → check-out", async () => {
    const flowPeriod = period(600, 3);
    const { createReservation, confirmReservation } =
      await import("../actions/reservations");
    const { reviewReservation } = await import("../actions/approval");
    const { checkIn, checkOut } = await import("../actions/checkin");

    asActor(IDS.users.flow, ["hospede"]);
    const created = await createReservation(
      buildInput({ preferredPeriods: [flowPeriod, period(650), period(680)] }),
    );
    expect(created?.serverError).toBeUndefined();
    const reservationId = requireDefined(
      created?.data?.reservationId,
      "reservationId",
    );
    createdReservationIds.push(reservationId);

    let [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId));
    expect(row?.status).toBe("solicitada");

    asActor(IDS.users.gestor, ["diretor"], ["gestor"]);
    const approved = await reviewReservation({
      reservationId,
      decision: "aprovada",
      unitId: UNIT_2,
      confirmedPeriod: await fetchStoredPeriod(reservationId, 1),
      managerNotes: "Aprovado — teste de fluxo completo",
    });
    expect(approved?.serverError).toBeUndefined();
    [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId));
    expect(row?.status).toBe("aprovada");
    const selectedPeriod = requireDefined(
      row?.selectedPeriod,
      "selectedPeriod",
    );
    // Sem deslocamento de canonicalização (P-7.6b): o período gravado bate
    // exatamente com o literal de preferência escolhido pelo hóspede.
    expect(selectedPeriod.start).toBe(isoDateOnly(flowPeriod.start));
    expect(selectedPeriod.end).toBe(isoDateOnly(flowPeriod.end));
    const expectedDaysUsed = Math.round(
      (new Date(`${selectedPeriod.end}T00:00:00Z`).getTime() -
        new Date(`${selectedPeriod.start}T00:00:00Z`).getTime()) /
        MS_PER_DAY,
    );

    const confirmed = await confirmReservation({ reservationId });
    expect(confirmed?.serverError).toBeUndefined();
    [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId));
    expect(row?.status).toBe("confirmada");

    const checkedIn = await checkIn({
      reservationId,
      occurredAt: flowPeriod.start,
      notes: null,
    });
    expect(checkedIn?.serverError).toBeUndefined();
    [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId));
    expect(row?.status).toBe("em_curso");

    const checkedOut = await checkOut({
      reservationId,
      occurredAt: flowPeriod.end,
      notes: null,
    });
    expect(checkedOut?.serverError).toBeUndefined();
    expect(checkedOut?.data?.daysUsed).toBe(expectedDaysUsed);
    [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId));
    expect(row?.status).toBe("concluida");

    const historyRows = await db
      .select()
      .from(usageHistory)
      .where(eq(usageHistory.reservationId, reservationId));
    expect(historyRows).toHaveLength(1);
    expect(historyRows[0]?.daysUsed).toBe(expectedDaysUsed);
  });
});

// ── Leitura de PII de terceiro pelo gestor grava audit (D8-002) ────────────

describe("getReservationDetail — leitura de PII pelo gestor audita pii.accessed", () => {
  // getApprovalQueue não entra neste teste: ela lista TODAS as reservas
  // "solicitada" do banco (compartilhado entre os testes deste arquivo), o
  // que arrastaria o documento anexado pelo fixture de P-7.9c e exigiria um
  // client Supabase Storage real (fora do que o mock de @hebron/auth/server
  // deste arquivo provê). getReservationDetail exercita exatamente o mesmo
  // caminho de wiring (loadReservationsWithGuests/accessLog) de forma
  // isolada ao fixture criado aqui.
  it("gestor lendo detalhe da reserva grava pii.accessed com o gestor como ator e o hóspede como sujeito", async () => {
    const { createReservation } = await import("../actions/reservations");
    const { getReservationDetail } = await import("../lib/queries");

    asActor(IDS.users.aid, ["hospede"]);
    const created = await createReservation(
      buildInput({
        preferredPeriods: [period(700), period(730), period(760)],
      }),
    );
    expect(created?.serverError).toBeUndefined();
    const reservationId = requireDefined(
      created?.data?.reservationId,
      "reservationId",
    );
    createdReservationIds.push(reservationId);

    // O responsável da reserva é o próprio hóspede submissor (guest.userId =
    // ctx.actorId em createReservation) — é ele o sujeito de logPiiAccess.
    const detail = await getReservationDetail(IDS.users.gestor, reservationId);
    expect(detail?.reservation.id).toBe(reservationId);

    const piiEntries = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, "pii.accessed"),
          eq(auditLog.actorId, IDS.users.gestor),
          eq(auditLog.entityId, IDS.users.aid),
        ),
      );
    expect(piiEntries).toHaveLength(1);
    expect(JSON.stringify(piiEntries[0]?.diff)).toContain("responsibleCpf");
    expect(JSON.stringify(piiEntries[0]?.diff)).not.toContain("12345678901");
  });
});

// ── daterange — round-trip write→read (P-7.6b) ─────────────────────────────

describe("daterange — round-trip write→read", () => {
  it("db.insert(period) → select devolve exatamente {start,end}, sem deslocamento", async () => {
    const inputPeriod = { start: "2027-03-01", end: "2027-03-05" };
    const [inserted] = await db
      .insert(reservations)
      .values({
        requestedBy: IDS.users.flow,
        purpose: "Teste de round-trip do daterange",
        status: "solicitada",
        selectedPeriod: inputPeriod,
      })
      .returning({ id: reservations.id });
    const reservationId = requireDefined(inserted?.id, "reservationId");
    createdReservationIds.push(reservationId);

    const [row] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId));

    expect(row?.selectedPeriod).toEqual(inputPeriod);
  });
});

// ── Auxílio: governança dual (D-4) ─────────────────────────────────────────

describe("Auxílio — payable nasce não aprovado e entra na governança dual (D-4)", () => {
  it("aid_request nasce 'solicitado'; aprovação cria payable 'pendente' (não aprovado)", async () => {
    const aidPeriod = period(700, 3);
    const { createReservation } = await import("../actions/reservations");
    const { reviewReservation } = await import("../actions/approval");
    const { reviewAidRequest } = await import("../actions/aid");

    asActor(IDS.users.aid, ["hospede"]);
    const created = await createReservation(
      buildInput({
        preferredPeriods: [aidPeriod, period(750), period(780)],
        aidRequest: {
          requestsDailyAllowance: true,
          transportMode: "nenhum",
          transportPassengerCount: null,
        },
      }),
    );
    expect(created?.serverError).toBeUndefined();
    const reservationId = requireDefined(
      created?.data?.reservationId,
      "reservationId",
    );
    createdReservationIds.push(reservationId);

    const [aidRowBefore] = await db
      .select()
      .from(aidRequests)
      .where(eq(aidRequests.reservationId, reservationId));
    const aidRequestId = requireDefined(aidRowBefore?.id, "aidRequestId");
    expect(aidRowBefore?.status).toBe("solicitado");

    // Aprova a reserva primeiro — onFlatsAssistanceApproved exige período
    // confirmado para calcular o vencimento do payable.
    asActor(IDS.users.gestor, ["diretor"], ["gestor"]);
    const approvedReservation = await reviewReservation({
      reservationId,
      decision: "aprovada",
      unitId: UNIT_1,
      confirmedPeriod: await fetchStoredPeriod(reservationId, 1),
      managerNotes: null,
    });
    expect(approvedReservation?.serverError).toBeUndefined();

    const approvedAid = await reviewAidRequest({
      aidRequestId,
      decision: "aprovado",
      dailyAllowanceAmount: 50,
      transportAmount: null,
    });
    expect(approvedAid?.serverError).toBeUndefined();

    const [aidRowAfter] = await db
      .select()
      .from(aidRequests)
      .where(eq(aidRequests.id, aidRequestId));
    expect(aidRowAfter?.status).toBe("aprovado");
    const financeiroExpenseId = requireDefined(
      aidRowAfter?.financeiroExpenseId,
      "financeiroExpenseId",
    );

    const [payable] = await db
      .select()
      .from(payables)
      .where(eq(payables.id, financeiroExpenseId));
    if (payable) createdPayableIds.push(payable.id);

    expect(payable).toBeDefined();
    expect(payable?.status).toBe("pendente");
  });
});
