/**
 * consents.test.ts — P-0.13 (LGPD: fundação).
 *
 * Testa o helper `packages/db/src/consents.ts` (getConsents/getConsent/
 * setConsent) contra o banco real e as policies RLS de `public.consents`:
 * o titular gerencia o próprio consentimento; super_admin/diretor só leem
 * (consentimento não é delegável — ninguém grava em nome de terceiro).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, roleAssignments, consents, auditLog } from "@hebron/db/schema";
import { getConsent, getConsents, setConsent } from "@hebron/db/consents";

const IDS = {
  titular: "d2000000-0000-0000-0000-000000000001",
  outroTitular: "d2000000-0000-0000-0000-000000000002",
  superAdmin: "d2000000-0000-0000-0000-000000000003",
} as const;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL)
  throw new Error("DATABASE_URL is required for consents tests");
const sql = postgres(DATABASE_URL, { prepare: false, max: 3 });

async function inRolledBackTx<T>(
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  try {
    await sql.begin(async (tx) => {
      result = await fn(tx);
      throw new Error("__rls_test_rollback__");
    });
  } catch (err) {
    if (!(err instanceof Error) || err.message !== "__rls_test_rollback__") {
      throw err;
    }
  }
  return result as T;
}

async function setRole(
  tx: postgres.TransactionSql,
  userId: string,
): Promise<void> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  await tx`SET LOCAL ROLE authenticated`;
  await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
}

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      {
        id: IDS.titular,
        email: "consent-titular@test.hebron",
        fullName: "Titular",
      },
      {
        id: IDS.outroTitular,
        email: "consent-outro@test.hebron",
        fullName: "Outro",
      },
      {
        id: IDS.superAdmin,
        email: "consent-admin@test.hebron",
        fullName: "Admin",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(roleAssignments)
    .values({
      userId: IDS.superAdmin,
      role: "super_admin",
      grantedBy: IDS.superAdmin,
    })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(auditLog).where(eq(auditLog.actorId, IDS.titular));
  await db.delete(consents).where(eq(consents.userId, IDS.titular));
  await db.delete(consents).where(eq(consents.userId, IDS.outroTitular));
  await db
    .delete(roleAssignments)
    .where(eq(roleAssignments.userId, IDS.superAdmin));
  for (const id of Object.values(IDS)) {
    await db.delete(users).where(eq(users.id, id));
  }
  await sql.end();
});

describe("setConsent / getConsent / getConsents", () => {
  it("cria consentimento concedido e é consultável por finalidade", async () => {
    const saved = await setConsent({
      userId: IDS.titular,
      purpose: "newsletter",
      granted: true,
      source: "cadastro-teste",
    });

    expect(saved.granted).toBe(true);
    expect(saved.grantedAt).not.toBeNull();
    expect(saved.revokedAt).toBeNull();

    const fetched = await getConsent(IDS.titular, "newsletter");
    expect(fetched?.granted).toBe(true);
  });

  it("é idempotente por (usuário, finalidade) — upsert, nunca duplica linha", async () => {
    await setConsent({
      userId: IDS.titular,
      purpose: "comunicacao",
      granted: true,
    });
    await setConsent({
      userId: IDS.titular,
      purpose: "comunicacao",
      granted: false,
    });

    const all = await getConsents(IDS.titular);
    const comunicacao = all.filter((c) => c.purpose === "comunicacao");
    expect(comunicacao).toHaveLength(1);
    expect(comunicacao[0]?.granted).toBe(false);
    expect(comunicacao[0]?.revokedAt).not.toBeNull();
  });

  it("registra audit log só quando o estado de fato muda", async () => {
    await db.delete(auditLog).where(eq(auditLog.actorId, IDS.titular));

    await setConsent({
      userId: IDS.titular,
      purpose: "dados_reserva",
      granted: true,
    });
    await setConsent({
      userId: IDS.titular,
      purpose: "dados_reserva",
      granted: true,
    }); // no-op

    const entries = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, IDS.titular));

    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("consent.granted");
  });
});

describe("RLS — public.consents", () => {
  it("titular lê o próprio consentimento", async () => {
    await setConsent({
      userId: IDS.titular,
      purpose: "dado_saude",
      granted: true,
    });

    const rows = await inRolledBackTx(async (tx) => {
      await setRole(tx, IDS.titular);
      return tx.unsafe(
        `SELECT purpose FROM public.consents WHERE user_id = '${IDS.titular}'`,
      );
    });

    expect(rows.length).toBeGreaterThan(0);
  });

  it("um titular NÃO lê o consentimento de outro", async () => {
    const rows = await inRolledBackTx(async (tx) => {
      await setRole(tx, IDS.outroTitular);
      return tx.unsafe(
        `SELECT purpose FROM public.consents WHERE user_id = '${IDS.titular}'`,
      );
    });

    expect(rows).toHaveLength(0);
  });

  it("super_admin lê o consentimento de qualquer titular", async () => {
    const rows = await inRolledBackTx(async (tx) => {
      await setRole(tx, IDS.superAdmin);
      return tx.unsafe(
        `SELECT purpose FROM public.consents WHERE user_id = '${IDS.titular}'`,
      );
    });

    expect(rows.length).toBeGreaterThan(0);
  });

  it("consentimento não é delegável: super_admin NÃO grava em nome de terceiro", async () => {
    const inserted = await inRolledBackTx(async (tx) => {
      await setRole(tx, IDS.superAdmin);
      try {
        await tx.unsafe(
          `INSERT INTO public.consents (user_id, purpose, granted)
           VALUES ('${IDS.outroTitular}', 'newsletter', true)`,
        );
        return true;
      } catch {
        return false;
      }
    });

    expect(inserted).toBe(false);
  });

  it("anon não lê nenhum consentimento", async () => {
    const rows = await inRolledBackTx(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      return tx.unsafe(`SELECT purpose FROM public.consents`);
    });

    expect(rows).toHaveLength(0);
  });
});
