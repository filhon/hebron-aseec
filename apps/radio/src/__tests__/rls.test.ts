/**
 * rls.test.ts — Políticas RLS do módulo radio (0050_radio_rls.sql, P-8.7)
 *
 * Testa via conexão direta (postgres.js) com SET LOCAL ROLE authenticated/anon
 * e request.jwt.claims, mesmo padrão de apps/flats/src/__tests__/rls.test.ts
 * e apps/plataforma/src/__tests__/rls.test.ts.
 *
 * Coberturas (critérios de aceite P-8.12):
 *  - radio.tracks: anon ouve sem cadastro (SELECT liberado, "ouvir sem
 *    cadastro", BRAIN §6.4).
 *  - radio.exclusive_materials: anon não acessa (sem GRANT); authenticated
 *    sem term_acceptances não vê nenhuma linha (RLS filtra); authenticated
 *    com term_acceptances vê o material.
 *  - radio.term_acceptances: aceite único por usuário — o índice único em
 *    user_id (schema/radio.ts) rejeita uma segunda linha para o mesmo
 *    usuário mesmo inserida diretamente via SQL (fora da idempotência da
 *    Server Action `acceptTerm`, coberta em materials.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  authors,
  tracks,
  exclusiveMaterials,
  termAcceptances,
} from "@hebron/db/schema";

const IDS = {
  users: {
    superAdmin: "8a120000-0000-0000-0000-000000000001",
    noTerm: "8a120000-0000-0000-0000-000000000002",
    withTerm: "8a120000-0000-0000-0000-000000000003",
  },
  author: "8a121000-0000-0000-0000-000000000001",
  track: "8a121000-0000-0000-0000-000000000002",
  material: "8a121000-0000-0000-0000-000000000003",
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────

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
 * INSERT é de fato rejeitado (a violação já aborta a transação). */
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
  await db
    .insert(users)
    .values([
      {
        id: IDS.users.superAdmin,
        email: "rls-radio-super@test.hebron",
        fullName: "RLS Radio SuperAdmin",
      },
      {
        id: IDS.users.noTerm,
        email: "rls-radio-sem-termo@test.hebron",
        fullName: "RLS Radio Sem Termo",
      },
      {
        id: IDS.users.withTerm,
        email: "rls-radio-com-termo@test.hebron",
        fullName: "RLS Radio Com Termo",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({
      userId: IDS.users.superAdmin,
      role: "super_admin",
      grantedBy: IDS.users.superAdmin,
    })
    .onConflictDoNothing();

  await db
    .insert(authors)
    .values({ id: IDS.author, name: "RLS Radio Autor" })
    .onConflictDoNothing();

  await db
    .insert(tracks)
    .values({
      id: IDS.track,
      title: "RLS Radio Faixa",
      authorId: IDS.author,
      fileUrl: "tracks/rls-test.mp3",
      durationSeconds: 900,
    })
    .onConflictDoNothing();

  await db
    .insert(exclusiveMaterials)
    .values({
      id: IDS.material,
      title: "RLS Radio Material Exclusivo",
      fileUrl: "materials/rls-test.pdf",
    })
    .onConflictDoNothing();

  await db
    .insert(termAcceptances)
    .values({ userId: IDS.users.withTerm })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(termAcceptances)
    .where(inArray(termAcceptances.userId, Object.values(IDS.users)));
  await db
    .delete(exclusiveMaterials)
    .where(eq(exclusiveMaterials.id, IDS.material));
  await db.delete(tracks).where(eq(tracks.id, IDS.track));
  await db.delete(authors).where(eq(authors.id, IDS.author));
  await db
    .delete(roleAssignments)
    .where(inArray(roleAssignments.userId, Object.values(IDS.users)));
  await db.delete(users).where(inArray(users.id, Object.values(IDS.users)));

  await sql.end();
});

// ── anon ouve sem cadastro ────────────────────────────────────────────────

describe("RLS — anon acessa radio.tracks (ouvir sem cadastro, BRAIN §6.4)", () => {
  it("anon SELECT em radio.tracks", async () => {
    const rows = await queryAsAnon(
      `SELECT id FROM radio.tracks WHERE id = '${IDS.track}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("anon SELECT em radio.authors", async () => {
    const rows = await queryAsAnon(
      `SELECT id FROM radio.authors WHERE id = '${IDS.author}'`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── anon não acessa materiais exclusivos ──────────────────────────────────

describe("RLS — anon NÃO acessa radio.exclusive_materials (sem GRANT no schema)", () => {
  it("anon NÃO lê radio.exclusive_materials (permission denied)", async () => {
    await expect(
      queryAsAnon(`SELECT id FROM radio.exclusive_materials LIMIT 10`),
    ).rejects.toThrow(
      /permission denied for (table|relation) exclusive_materials/i,
    );
  });
});

// ── autenticado sem termo não acessa materials ────────────────────────────

describe("RLS — autenticado SEM termo aceito não acessa radio.exclusive_materials", () => {
  it("usuário sem term_acceptances NÃO vê o material exclusivo", async () => {
    const rows = await queryAs(
      IDS.users.noTerm,
      `SELECT id FROM radio.exclusive_materials WHERE id = '${IDS.material}'`,
    );
    expect(rows).toHaveLength(0);
  });
});

// ── autenticado com termo acessa materials ────────────────────────────────

describe("RLS — autenticado COM termo aceito acessa radio.exclusive_materials", () => {
  it("usuário com term_acceptances vê o material exclusivo", async () => {
    const rows = await queryAs(
      IDS.users.withTerm,
      `SELECT id FROM radio.exclusive_materials WHERE id = '${IDS.material}'`,
    );
    expect(rows).toHaveLength(1);
  });
});

// ── termo: duplo aceite retorna erro (unique constraint) ──────────────────
// A Server Action `acceptTerm` (actions/terms.ts) é deliberadamente
// idempotente (retorna o aceite existente em vez de tentar um segundo
// INSERT — coberto em materials.test.ts). Esta camada abaixo dela — a
// constraint de banco `term_acceptances.user_id` UNIQUE — é o que de fato
// impede duas linhas para o mesmo usuário: uma segunda tentativa de INSERT
// direto (contornando o guard de aplicação) é rejeitada com erro.

describe("RLS — term_acceptances: unicidade por usuário (duplo aceite retorna erro)", () => {
  it("primeiro aceite insere normalmente (controle positivo)", async () => {
    await insertAs(
      IDS.users.noTerm,
      `INSERT INTO radio.term_acceptances (user_id) VALUES ('${IDS.users.noTerm}')`,
    );
    const rows = await queryAs(
      IDS.users.noTerm,
      `SELECT id FROM radio.term_acceptances WHERE user_id = '${IDS.users.noTerm}'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("segundo aceite do MESMO usuário é rejeitado (unique constraint)", async () => {
    await expect(
      insertAs(
        IDS.users.noTerm,
        `INSERT INTO radio.term_acceptances (user_id) VALUES ('${IDS.users.noTerm}')`,
      ),
    ).rejects.toThrow(/duplicate key|unique constraint/i);
  });
});
