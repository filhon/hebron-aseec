/**
 * rls.test.ts
 *
 * Testa as políticas RLS do banco usando conexão direta (postgres.js).
 * Simula diferentes papéis usando SET LOCAL ROLE authenticated e
 * set_config('request.jwt.claims', ...) dentro de transações.
 *
 * Os GRANTs para `authenticated`/`anon` no schema admin são permanentes
 * (0014_grants_authenticated.sql, P-0.10) — este arquivo não precisa mais
 * concedê-los/revogá-los ao redor da suíte.
 *
 * Requer: DATABASE_URL (superuser, para seed/cleanup) e esquema migrado.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import {
  users,
  roleAssignments,
  auditLog,
  invitations,
} from "@hebron/db/schema";

// ── Fixtures ──────────────────────────────────────────────────────────────────
// UUIDs fixos para facilitar cleanup determinístico.

const IDS = {
  superAdmin: "c1000000-0000-0000-0000-000000000001",
  diretor: "c1000000-0000-0000-0000-000000000002",
  colaborador: "c1000000-0000-0000-0000-000000000003",
  hospede: "c1000000-0000-0000-0000-000000000004",
} as const;

const EMAILS = {
  superAdmin: "rls-super@test.hebron",
  diretor: "rls-diretor@test.hebron",
  colaborador: "rls-colaborador@test.hebron",
  hospede: "rls-hospede@test.hebron",
};

// Conexão direta para testes RLS (sem drizzle, para rodar SQL raw no contexto de transação)
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Executa uma query SQL como um usuário autenticado simulado, usando
 * SET LOCAL ROLE authenticated e request.jwt.claims com o sub do usuário.
 * Retorna as linhas resultantes e sempre faz ROLLBACK para não poluir o estado.
 */
async function queryAs(userId: string, query: string): Promise<postgres.Row[]> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  let rows: postgres.Row[] = [];

  try {
    await sql.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
      rows = await tx.unsafe(query);
      // Força rollback — testes RLS são read-only
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (err instanceof Error && err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }

  return rows;
}

/** Mesma ideia, mas como `anon` — sem sub/claims (visitante não autenticado). */
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

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  // Seed: usuários e papéis
  const fixtures = [
    {
      id: IDS.superAdmin,
      email: EMAILS.superAdmin,
      fullName: "RLS SuperAdmin",
    },
    { id: IDS.diretor, email: EMAILS.diretor, fullName: "RLS Diretor" },
    {
      id: IDS.colaborador,
      email: EMAILS.colaborador,
      fullName: "RLS Colaborador",
    },
    { id: IDS.hospede, email: EMAILS.hospede, fullName: "RLS Hóspede" },
  ];

  for (const f of fixtures) {
    await db.insert(users).values(f).onConflictDoNothing();
  }

  const roleSeed = [
    {
      userId: IDS.superAdmin,
      role: "super_admin" as const,
      grantedBy: IDS.superAdmin,
    },
    {
      userId: IDS.diretor,
      role: "diretor" as const,
      grantedBy: IDS.superAdmin,
    },
    {
      userId: IDS.colaborador,
      role: "colaborador" as const,
      grantedBy: IDS.superAdmin,
    },
    {
      userId: IDS.hospede,
      role: "hospede" as const,
      grantedBy: IDS.superAdmin,
    },
  ];

  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  // Seed: uma entrada no audit_log (criada via service role — contorna RLS de INSERT)
  await db
    .insert(auditLog)
    .values({
      actorId: IDS.superAdmin,
      action: "user.created",
      entity: "user",
      entityId: IDS.superAdmin,
      diff: { test: true },
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  // Cleanup na ordem inversa das FKs
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.superAdmin));

  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }

  await sql.end();
});

// ── Testes: public.users ──────────────────────────────────────────────────────

describe("RLS — public.users", () => {
  it("super_admin lê todos os usuários", async () => {
    const rows = await queryAs(IDS.superAdmin, "SELECT id FROM public.users");
    const ids = rows.map((r) => r["id"]);
    expect(ids).toContain(IDS.superAdmin);
    expect(ids).toContain(IDS.diretor);
    expect(ids).toContain(IDS.colaborador);
    expect(ids).toContain(IDS.hospede);
  });

  it("diretor lê todos os usuários", async () => {
    const rows = await queryAs(IDS.diretor, "SELECT id FROM public.users");
    const ids = rows.map((r) => r["id"]);
    expect(ids).toContain(IDS.superAdmin);
    expect(ids).toContain(IDS.colaborador);
  });

  it("colaborador lê apenas o próprio perfil", async () => {
    const rows = await queryAs(IDS.colaborador, "SELECT id FROM public.users");
    const ids = rows.map((r) => r["id"]);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe(IDS.colaborador);
  });

  it("hóspede lê apenas o próprio perfil", async () => {
    const rows = await queryAs(IDS.hospede, "SELECT id FROM public.users");
    const ids = rows.map((r) => r["id"]);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe(IDS.hospede);
  });
});

// ── Testes: public.role_assignments ──────────────────────────────────────────

describe("RLS — public.role_assignments", () => {
  it("super_admin lê todas as atribuições", async () => {
    const rows = await queryAs(
      IDS.superAdmin,
      "SELECT user_id FROM public.role_assignments",
    );
    const ids = rows.map((r) => r["user_id"]);
    expect(ids).toContain(IDS.superAdmin);
    expect(ids).toContain(IDS.diretor);
    expect(ids).toContain(IDS.colaborador);
  });

  it("diretor lê todas as atribuições", async () => {
    const rows = await queryAs(
      IDS.diretor,
      "SELECT user_id FROM public.role_assignments",
    );
    const ids = rows.map((r) => r["user_id"]);
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });

  it("colaborador lê apenas a própria atribuição de papel", async () => {
    const rows = await queryAs(
      IDS.colaborador,
      "SELECT user_id FROM public.role_assignments",
    );
    const ids = rows.map((r) => r["user_id"]);
    expect(ids.every((id) => id === IDS.colaborador)).toBe(true);
  });
});

// ── Testes: admin.audit_log ───────────────────────────────────────────────────

describe("RLS — admin.audit_log", () => {
  it("super_admin lê o audit_log", async () => {
    const rows = await queryAs(
      IDS.superAdmin,
      "SELECT id FROM admin.audit_log LIMIT 1",
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("diretor NÃO lê o audit_log (política restrita a super_admin em 0003)", async () => {
    const rows = await queryAs(
      IDS.diretor,
      "SELECT id FROM admin.audit_log LIMIT 10",
    );
    expect(rows).toHaveLength(0);
  });

  it("colaborador NÃO lê o audit_log", async () => {
    const rows = await queryAs(
      IDS.colaborador,
      "SELECT id FROM admin.audit_log LIMIT 10",
    );
    expect(rows).toHaveLength(0);
  });

  it("hóspede NÃO lê o audit_log", async () => {
    const rows = await queryAs(
      IDS.hospede,
      "SELECT id FROM admin.audit_log LIMIT 10",
    );
    expect(rows).toHaveLength(0);
  });
});

// ── Testes: admin.invitations ─────────────────────────────────────────────────

describe("RLS — admin.invitations", () => {
  const INVITE_TOKEN = "rls-test-token-000000000000000000000000000001";
  const INVITE_EMAIL = EMAILS.colaborador;

  beforeAll(async () => {
    // Seed convite vinculado ao email do colaborador
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db
      .insert(invitations)
      .values({
        email: INVITE_EMAIL,
        roles: ["colaborador"],
        token: INVITE_TOKEN,
        invitedBy: IDS.superAdmin,
        expiresAt: future,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(invitations).where(eq(invitations.token, INVITE_TOKEN));
  });

  it("super_admin lê convites", async () => {
    const rows = await queryAs(
      IDS.superAdmin,
      `SELECT id FROM admin.invitations WHERE token = '${INVITE_TOKEN}'`,
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("usuário cujo email coincide lê o próprio convite", async () => {
    // Policy invitations_select_own_email: email = auth.jwt() ->> 'email'
    const claims = JSON.stringify({
      sub: IDS.colaborador,
      email: INVITE_EMAIL,
      role: "authenticated",
    });

    let rows: postgres.Row[] = [];
    try {
      await sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
        rows = await tx.unsafe(
          `SELECT id FROM admin.invitations WHERE token = '${INVITE_TOKEN}'`,
        );
        throw new Error("__rls_test_rollback__");
      });
    } catch (err) {
      if (err instanceof Error && err.message !== "__rls_test_rollback__")
        throw err;
    }

    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("usuário sem email correspondente NÃO lê convites de terceiros", async () => {
    // IDS.hospede não tem email correspondente ao convite
    const rows = await queryAs(
      IDS.hospede,
      `SELECT id FROM admin.invitations WHERE token = '${INVITE_TOKEN}'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("convite NÃO é enumerável por token sem estar autenticado (F3-04)", async () => {
    // invitations_select_by_token (USING (true)) foi removida em 0003_admin_rls
    // e anon nunca recebeu GRANT USAGE no schema admin (0014) — a negação
    // acontece antes mesmo de qualquer policy ser avaliada.
    await expect(
      queryAsAnon(
        `SELECT id FROM admin.invitations WHERE token = '${INVITE_TOKEN}'`,
      ),
    ).rejects.toThrow(/permission denied for schema admin/i);
  });
});

// ── Testes: anon não lê nada do schema admin ──────────────────────────────────
// `anon` nunca recebe GRANT USAGE em admin (0014_grants_authenticated.sql):
// a negação acontece na camada de GRANT, antes de qualquer RLS ser avaliada —
// mais forte do que "0 linhas".

describe("RLS — anon não lê nada de admin.*", () => {
  it("anon NÃO lê admin.audit_log (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM admin.audit_log LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema admin/i);
  });

  it("anon NÃO lê admin.invitations (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM admin.invitations LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema admin/i);
  });

  it("anon NÃO lê admin.system_settings (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM admin.system_settings LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema admin/i);
  });

  it("anon NÃO lê public.users (PII: nome, email, CPF, telefone) — RLS retorna 0 linhas", async () => {
    const rows = await queryAsAnon("SELECT id FROM public.users LIMIT 10");
    expect(rows).toHaveLength(0);
  });
});

// ── Regressão F2-A1 (CRÍTICO) ─────────────────────────────────────────────────
// "App Admin inteiro sem proteção de leitura: [...] Visitante anônimo lê
// nome/e-mail/CPF/telefone de todos os usuários, audit log, convites."
// A causa raiz era a leitura via `db` (conexão superuser, `DATABASE_URL`),
// que ignora RLS. `withAuthenticatedContext` é o caminho que as páginas
// devem adotar (P-0.10 escopo) — este teste prova que, através dele, os
// mesmos dados deixam de vazar.

describe("Regressão F2-A1 — leitura via client autenticado não vaza dados", () => {
  it("sem sessão (anon) — withAuthenticatedContext(null, ...) não retorna usuários", async () => {
    const userRows = await withAuthenticatedContext(null, async (tx) =>
      tx.execute(drizzleSql`SELECT id FROM public.users`),
    );
    expect(Array.from(userRows)).toHaveLength(0);
  });

  it("sem sessão (anon) — withAuthenticatedContext(null, ...) nem chega a acessar admin.* (permission denied)", async () => {
    await expect(
      withAuthenticatedContext(null, async (tx) =>
        tx.execute(drizzleSql`SELECT id FROM admin.audit_log`),
      ),
    ).rejects.toThrow(/permission denied for schema admin/i);

    await expect(
      withAuthenticatedContext(null, async (tx) =>
        tx.execute(drizzleSql`SELECT id FROM admin.invitations`),
      ),
    ).rejects.toThrow(/permission denied for schema admin/i);
  });

  it("colaborador autenticado — withAuthenticatedContext lê o próprio perfil, mas não o audit_log", async () => {
    const [userRows, auditRows] = await withAuthenticatedContext(
      { actorId: IDS.colaborador },
      async (tx) => {
        const u = await tx.execute(drizzleSql`SELECT id FROM public.users`);
        const a = await tx.execute(drizzleSql`SELECT id FROM admin.audit_log`);
        return [u, a];
      },
    );

    const userIds = Array.from(userRows).map((r) => (r as { id: string }).id);
    expect(userIds).toEqual([IDS.colaborador]);
    expect(Array.from(auditRows)).toHaveLength(0);
  });
});
