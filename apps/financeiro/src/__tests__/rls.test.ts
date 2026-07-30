/**
 * rls.test.ts — Políticas RLS do schema financeiro (P-3.7, P-0.10).
 *
 * Testa via conexão direta (postgres.js) com SET LOCAL ROLE authenticated
 * e request.jwt.claims para simular diferentes usuários. Os GRANTs para
 * `authenticated` no schema financeiro são permanentes
 * (0014_grants_authenticated.sql, P-0.10). `anon` nunca recebe grant algum
 * em financeiro.* — dados financeiros são sempre internos.
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
  bankAccounts,
  payables,
} from "@hebron/db/schema";

const IDS = {
  superAdmin: "e1000000-0000-0000-0000-000000000001",
  diretor: "e1000000-0000-0000-0000-000000000002",
  colaborador: "e1000000-0000-0000-0000-000000000003",
  hospede: "e1000000-0000-0000-0000-000000000004",
  submissor: "e1000000-0000-0000-0000-000000000005",
} as const;

const ACCOUNT_ID = "e1000000-0000-0000-0000-000000000010";
const PAYABLE_ID = "e1000000-0000-0000-0000-000000000011";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for RLS tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

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

beforeAll(async () => {
  const userFixtures = [
    {
      id: IDS.superAdmin,
      email: "rls-fin-super@test.hebron",
      fullName: "RLS Fin SuperAdmin",
    },
    {
      id: IDS.diretor,
      email: "rls-fin-dir@test.hebron",
      fullName: "RLS Fin Diretor",
    },
    {
      id: IDS.colaborador,
      email: "rls-fin-colab@test.hebron",
      fullName: "RLS Fin Colaborador",
    },
    {
      id: IDS.hospede,
      email: "rls-fin-hospede@test.hebron",
      fullName: "RLS Fin Hóspede",
    },
    {
      id: IDS.submissor,
      email: "rls-fin-submissor@test.hebron",
      fullName: "RLS Fin Submissor",
    },
  ];
  for (const u of userFixtures) {
    await db.insert(users).values(u).onConflictDoNothing();
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
    {
      userId: IDS.submissor,
      role: "submissor" as const,
      grantedBy: IDS.superAdmin,
    },
  ];
  for (const r of roleSeed) {
    await db.insert(roleAssignments).values(r).onConflictDoNothing();
  }

  await db
    .insert(bankAccounts)
    .values({
      id: ACCOUNT_ID,
      bankName: "Banco RLS Teste",
      nickname: "Conta RLS Teste",
      createdBy: IDS.superAdmin,
    })
    .onConflictDoNothing();

  await db
    .insert(payables)
    .values({
      id: PAYABLE_ID,
      description: "RLS Test Payable",
      amount: "100.00",
      dueDate: "2026-12-31",
      accountId: ACCOUNT_ID,
      createdBy: IDS.superAdmin,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(payables).where(eq(payables.id, PAYABLE_ID));
  await db.delete(bankAccounts).where(eq(bankAccounts.id, ACCOUNT_ID));
  for (const id of Object.values(IDS)) {
    await db.delete(roleAssignments).where(eq(roleAssignments.userId, id));
  }
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
  await sql.end();
});

describe("RLS — financeiro.accounts / payables: staff vê, hóspede não", () => {
  it("super_admin lê accounts e payables", async () => {
    const acc = await queryAs(
      IDS.superAdmin,
      `SELECT id FROM financeiro.accounts WHERE id = '${ACCOUNT_ID}'`,
    );
    const pay = await queryAs(
      IDS.superAdmin,
      `SELECT id FROM financeiro.payables WHERE id = '${PAYABLE_ID}'`,
    );
    expect(acc).toHaveLength(1);
    expect(pay).toHaveLength(1);
  });

  it("diretor lê accounts e payables", async () => {
    const acc = await queryAs(
      IDS.diretor,
      `SELECT id FROM financeiro.accounts WHERE id = '${ACCOUNT_ID}'`,
    );
    expect(acc).toHaveLength(1);
  });

  it("colaborador lê accounts e payables", async () => {
    const pay = await queryAs(
      IDS.colaborador,
      `SELECT id FROM financeiro.payables WHERE id = '${PAYABLE_ID}'`,
    );
    expect(pay).toHaveLength(1);
  });

  it("hóspede (sem papel financeiro) NÃO lê accounts", async () => {
    const acc = await queryAs(
      IDS.hospede,
      `SELECT id FROM financeiro.accounts WHERE id = '${ACCOUNT_ID}'`,
    );
    expect(acc).toHaveLength(0);
  });

  it("hóspede (sem papel financeiro) NÃO lê payables", async () => {
    const pay = await queryAs(
      IDS.hospede,
      `SELECT id FROM financeiro.payables WHERE id = '${PAYABLE_ID}'`,
    );
    expect(pay).toHaveLength(0);
  });
});

// ── submissor: sem papel financeiro, sem exceção por projeto ─────────────────
// As policies de SELECT do schema financeiro (payables/transactions/etc.)
// checam apenas has_role('super_admin', 'diretor', 'colaborador') — submissor
// nunca está nessa lista (0010_financeiro.sql / 0011_financeiro_rls.sql).
// Não há coluna "dono"/projeto em financeiro.transactions para escopar por
// projeto: a garantia de "não vê transações de outros projetos" vem do
// bloqueio total de acesso ao schema — submissor não vê NENHUMA transação,
// própria ou alheia (o acesso de submissor a dados de projeto fica em
// projetos.payment_schedules, escopado por organização — RLS testado em
// apps/projetos).
describe("RLS — financeiro.transactions: submissor não vê transações de outros projetos", () => {
  it("submissor NÃO lê financeiro.payables (sem papel financeiro)", async () => {
    const pay = await queryAs(
      IDS.submissor,
      `SELECT id FROM financeiro.payables WHERE id = '${PAYABLE_ID}'`,
    );
    expect(pay).toHaveLength(0);
  });

  it("submissor NÃO lê financeiro.transactions (sem papel financeiro)", async () => {
    const tx = await queryAs(
      IDS.submissor,
      "SELECT id FROM financeiro.transactions LIMIT 10",
    );
    expect(tx).toHaveLength(0);
  });
});

describe("RLS — financeiro.transactions: imutabilidade também no GRANT", () => {
  it("colaborador NÃO consegue UPDATE em transactions (nem chega a avaliar o trigger)", async () => {
    const claims = JSON.stringify({
      sub: IDS.colaborador,
      role: "authenticated",
    });
    await expect(
      sql.begin(async (tx) => {
        await tx`SET LOCAL ROLE authenticated`;
        await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
        await tx.unsafe(
          "UPDATE financeiro.transactions SET description = 'x' WHERE true",
        );
      }),
    ).rejects.toThrow(/permission denied/i);
  });
});

// ── anon não lê nada de financeiro.* ──────────────────────────────────────────
// `anon` nunca recebe GRANT USAGE em financeiro (0014_grants_authenticated.sql):
// a negação acontece na camada de GRANT, antes de qualquer RLS ser avaliada —
// mais forte do que "0 linhas".

describe("RLS — anon não lê nada de financeiro.*", () => {
  it("anon NÃO lê financeiro.accounts (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon(
        `SELECT id FROM financeiro.accounts WHERE id = '${ACCOUNT_ID}'`,
      ),
    ).rejects.toThrow(/permission denied for schema financeiro/i);
  });

  it("anon NÃO lê financeiro.payables (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon(
        `SELECT id FROM financeiro.payables WHERE id = '${PAYABLE_ID}'`,
      ),
    ).rejects.toThrow(/permission denied for schema financeiro/i);
  });

  it("anon NÃO lê financeiro.transactions (permission denied — sem USAGE no schema)", async () => {
    await expect(
      queryAsAnon("SELECT id FROM financeiro.transactions LIMIT 10"),
    ).rejects.toThrow(/permission denied for schema financeiro/i);
  });
});

// ── Regressão — leitura via client autenticado do kit (P-0.10) ───────────────

describe("Regressão — financeiro via withAuthenticatedContext", () => {
  it("sem sessão (anon) nem chega a acessar financeiro.payables (permission denied)", async () => {
    await expect(
      withAuthenticatedContext(null, async (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM financeiro.payables WHERE id = ${PAYABLE_ID}`,
        ),
      ),
    ).rejects.toThrow(/permission denied for schema financeiro/i);
  });

  it("colaborador via withAuthenticatedContext lê financeiro.payables", async () => {
    const rows = await withAuthenticatedContext(
      { actorId: IDS.colaborador },
      async (tx) =>
        tx.execute(
          drizzleSql`SELECT id FROM financeiro.payables WHERE id = ${PAYABLE_ID}`,
        ),
    );
    expect(Array.from(rows)).toHaveLength(1);
  });
});
