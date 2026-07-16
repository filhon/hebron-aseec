/**
 * rls.test.ts — Políticas RLS do módulo flats (0022_flats_rls.sql, P-7.7)
 *
 * Testa via conexão direta (postgres.js) com SET LOCAL ROLE authenticated e
 * request.jwt.claims, mesmo padrão de apps/projetos/src/__tests__/rls.test.ts.
 *
 * Coberturas (critérios de aceite P-7.12):
 *  - flats.reservations: hóspede vê apenas as próprias; gestor (diretor +
 *    designation "gestor") e super_admin veem tudo; diretor sem designation
 *    não vê reservas alheias.
 *  - flats.reservations INSERT: diretor/conselheiro NUNCA conseguem criar
 *    reserva, mesmo tentando com requested_by = si mesmos (conflito de
 *    interesse, reservations_insert_own).
 *  - flats.guests / flats.scoring_responses: PII e dado de saúde — SELECT
 *    restrito ao próprio dono da reserva, gestor e super_admin.
 *  - anon não lê nada de flats.* (sem GRANT USAGE no schema).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  reservations,
  flatsGuests as guests,
  scoringResponses,
} from "@hebron/db/schema";

const IDS = {
  users: {
    superAdmin: "f7120000-0000-0000-0000-000000000001",
    gestor: "f7120000-0000-0000-0000-000000000002",
    diretorSemDesignation: "f7120000-0000-0000-0000-000000000003",
    conselheiro: "f7120000-0000-0000-0000-000000000004",
    hospedeA: "f7120000-0000-0000-0000-000000000005",
    hospedeB: "f7120000-0000-0000-0000-000000000006",
  },
  reservations: {
    reservationA: "f7121000-0000-0000-0000-000000000001",
    reservationB: "f7121000-0000-0000-0000-000000000002",
  },
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helper ────────────────────────────────────────────────────────────────

async function queryAs(userId: string, query: string): Promise<postgres.Row[]> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  let rows: postgres.Row[] = [];

  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }

  return rows;
}

async function queryAsAnon(query: string): Promise<postgres.Row[]> {
  let rows: postgres.Row[] = [];
  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      rows = await tx.unsafe(query);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }
  return rows;
}

/** Roda `query` como `userId` sem fazer rollback — usada para provar que um
 * INSERT é de fato rejeitado (a violação de RLS já aborta a transação). */
async function insertAs(userId: string, query: string): Promise<void> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  await sql.begin(async (tx) => {
    await tx`SET LOCAL ROLE authenticated`;
    await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    await tx.unsafe(query);
  });
}

// ── Setup / Teardown ─────────────────────────────────────────────────────

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.users.superAdmin,
      email: "rls-flats-super@test.hebron",
      fullName: "RLS Flats SuperAdmin",
    },
    {
      id: IDS.users.gestor,
      email: "rls-flats-gestor@test.hebron",
      fullName: "RLS Flats Gestor",
    },
    {
      id: IDS.users.diretorSemDesignation,
      email: "rls-flats-diretor@test.hebron",
      fullName: "RLS Flats Diretor sem designation",
    },
    {
      id: IDS.users.conselheiro,
      email: "rls-flats-conselheiro@test.hebron",
      fullName: "RLS Flats Conselheiro",
    },
    {
      id: IDS.users.hospedeA,
      email: "rls-flats-hospede-a@test.hebron",
      fullName: "RLS Flats Hospede A",
    },
    {
      id: IDS.users.hospedeB,
      email: "rls-flats-hospede-b@test.hebron",
      fullName: "RLS Flats Hospede B",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
  }

  const roleSeed = [
    { userId: IDS.users.superAdmin, role: "super_admin" as const },
    { userId: IDS.users.gestor, role: "diretor" as const },
    { userId: IDS.users.diretorSemDesignation, role: "diretor" as const },
    { userId: IDS.users.conselheiro, role: "conselheiro" as const },
    { userId: IDS.users.hospedeA, role: "hospede" as const },
    { userId: IDS.users.hospedeB, role: "hospede" as const },
  ];
  for (const r of roleSeed) {
    await db
      .insert(roleAssignments)
      .values({ ...r, grantedBy: IDS.users.superAdmin })
      .onConflictDoNothing();
  }

  await db
    .insert(designations)
    .values({
      userId: IDS.users.gestor,
      type: "gestor",
      assignedBy: IDS.users.superAdmin,
    })
    .onConflictDoNothing();

  await db
    .insert(reservations)
    .values([
      {
        id: IDS.reservations.reservationA,
        requestedBy: IDS.users.hospedeA,
        purpose: "Descanso ministerial — teste RLS A",
      },
      {
        id: IDS.reservations.reservationB,
        requestedBy: IDS.users.hospedeB,
        purpose: "Descanso ministerial — teste RLS B",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(guests)
    .values([
      {
        reservationId: IDS.reservations.reservationA,
        userId: IDS.users.hospedeA,
        name: "Responsável A",
        cpf: "11111111111",
        birthDate: "1980-01-01",
        isResponsible: true,
      },
      {
        reservationId: IDS.reservations.reservationB,
        userId: IDS.users.hospedeB,
        name: "Responsável B",
        cpf: "22222222222",
        birthDate: "1985-01-01",
        isResponsible: true,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(scoringResponses)
    .values([
      {
        reservationId: IDS.reservations.reservationA,
        criterion: "a_tempo_ministerio",
        value: "5",
        points: 5,
      },
      {
        reservationId: IDS.reservations.reservationB,
        criterion: "a_tempo_ministerio",
        value: "3",
        points: 3,
      },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(reservations)
    .where(inArray(reservations.id, Object.values(IDS.reservations)));
  await db
    .delete(designations)
    .where(eq(designations.userId, IDS.users.gestor));
  for (const id of Object.values(IDS.users)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS.users)) {
    await db.delete(users).where(eq(users.id, id));
  }

  await sql.end();
});

// ── RLS: flats.reservations — hóspede vê apenas as próprias ───────────────

describe("RLS — flats.reservations: hóspede vê apenas a própria reserva", () => {
  it("hospedeA vê a própria reserva", async () => {
    const rows = await queryAs(
      IDS.users.hospedeA,
      `SELECT id FROM flats.reservations WHERE id = '${IDS.reservations.reservationA}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("hospedeA NÃO vê a reserva de hospedeB", async () => {
    const rows = await queryAs(
      IDS.users.hospedeA,
      `SELECT id FROM flats.reservations WHERE id = '${IDS.reservations.reservationB}'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── RLS: flats.reservations — gestor / super_admin / diretor sem designation ──

describe("RLS — flats.reservations: gestor e super_admin veem tudo, diretor comum não", () => {
  it("gestor (diretor + designation gestor) vê reservas de qualquer hóspede", async () => {
    const rows = await queryAs(
      IDS.users.gestor,
      `SELECT id FROM flats.reservations WHERE id IN ('${IDS.reservations.reservationA}','${IDS.reservations.reservationB}')`,
    );
    expect(rows).toHaveLength(2);
  });

  it("super_admin vê reservas de qualquer hóspede", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      `SELECT id FROM flats.reservations WHERE id IN ('${IDS.reservations.reservationA}','${IDS.reservations.reservationB}')`,
    );
    expect(rows).toHaveLength(2);
  });

  it("diretor SEM designation gestor não vê reservas alheias", async () => {
    const rows = await queryAs(
      IDS.users.diretorSemDesignation,
      `SELECT id FROM flats.reservations WHERE id IN ('${IDS.reservations.reservationA}','${IDS.reservations.reservationB}')`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── RLS: flats.reservations INSERT — diretor/conselheiro nunca reservam ───

describe("RLS — flats.reservations: diretor/conselheiro NÃO criam reserva (conflito de interesse)", () => {
  it("diretor (mesmo gestor) não consegue INSERT em flats.reservations", async () => {
    await expect(
      insertAs(
        IDS.users.gestor,
        `INSERT INTO flats.reservations (requested_by, purpose) VALUES ('${IDS.users.gestor}', 'Tentativa de reserva por diretor')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("conselheiro não consegue INSERT em flats.reservations", async () => {
    await expect(
      insertAs(
        IDS.users.conselheiro,
        `INSERT INTO flats.reservations (requested_by, purpose) VALUES ('${IDS.users.conselheiro}', 'Tentativa de reserva por conselheiro')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("hóspede consegue INSERT na própria reserva (controle positivo)", async () => {
    const insertedId = "f7121000-0000-0000-0000-000000000099";
    await insertAs(
      IDS.users.hospedeA,
      `INSERT INTO flats.reservations (id, requested_by, purpose) VALUES ('${insertedId}', '${IDS.users.hospedeA}', 'Controle positivo — hóspede insere')`,
    );
    await db.delete(reservations).where(eq(reservations.id, insertedId));
  });
});

// ── RLS: flats.guests — PII restrita ao dono, gestor e super_admin ────────

describe("RLS — flats.guests: PII restrita ao dono da reserva, gestor e super_admin", () => {
  it("hospedeA vê os próprios guests (reservation A)", async () => {
    const rows = await queryAs(
      IDS.users.hospedeA,
      `SELECT id FROM flats.guests WHERE reservation_id = '${IDS.reservations.reservationA}'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("hospedeA NÃO vê guests da reserva de hospedeB", async () => {
    const rows = await queryAs(
      IDS.users.hospedeA,
      `SELECT id FROM flats.guests WHERE reservation_id = '${IDS.reservations.reservationB}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("gestor vê guests de qualquer reserva", async () => {
    const rows = await queryAs(
      IDS.users.gestor,
      `SELECT id FROM flats.guests WHERE reservation_id IN ('${IDS.reservations.reservationA}','${IDS.reservations.reservationB}')`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("diretor SEM designation gestor NÃO vê guests", async () => {
    const rows = await queryAs(
      IDS.users.diretorSemDesignation,
      `SELECT id FROM flats.guests WHERE reservation_id IN ('${IDS.reservations.reservationA}','${IDS.reservations.reservationB}')`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── RLS: flats.scoring_responses — mesma restrição de flats.guests ────────

describe("RLS — flats.scoring_responses: restrita ao dono, gestor e super_admin", () => {
  it("hospedeB vê os próprios scoring_responses", async () => {
    const rows = await queryAs(
      IDS.users.hospedeB,
      `SELECT id FROM flats.scoring_responses WHERE reservation_id = '${IDS.reservations.reservationB}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("hospedeB NÃO vê scoring_responses da reserva de hospedeA", async () => {
    const rows = await queryAs(
      IDS.users.hospedeB,
      `SELECT id FROM flats.scoring_responses WHERE reservation_id = '${IDS.reservations.reservationA}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("super_admin vê scoring_responses de qualquer reserva", async () => {
    const rows = await queryAs(
      IDS.users.superAdmin,
      `SELECT id FROM flats.scoring_responses WHERE reservation_id IN ('${IDS.reservations.reservationA}','${IDS.reservations.reservationB}')`,
    );
    expect(rows).toHaveLength(2);
  });
});

// ── anon não lê nada de flats.* ─────────────────────────────────────────
// Schema "flats" não concede GRANT USAGE a `anon` (0022_flats_rls.sql) — a
// negação acontece na camada de GRANT, antes de qualquer RLS ser avaliada.

describe("RLS — anon não lê nada de flats.*", () => {
  it("anon NÃO lê flats.reservations (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM flats.reservations LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema flats/i);
  });

  it("anon NÃO lê flats.guests (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM flats.guests LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema flats/i);
  });
});
