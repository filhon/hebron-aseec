/**
 * system-actor.test.ts — ator sistema para jobs em background (P-0.14)
 *
 * Sem mock: cria o usuário real via Admin API (mesmo caminho de produção),
 * confirma o papel super_admin e a idempotência do get-or-create.
 */
import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { users, roleAssignments } from "../schema/public";
import { getSystemActorId } from "../system-actor";

const SYSTEM_ACTOR_EMAIL = "sistema@hebronaseec.org.br";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

afterAll(async () => {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SYSTEM_ACTOR_EMAIL))
    .limit(1);

  if (!row) return;

  await db.delete(roleAssignments).where(eq(roleAssignments.userId, row.id));
  await db.delete(users).where(eq(users.id, row.id));

  const admin = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
  await admin.auth.admin.deleteUser(row.id);
});

describe("getSystemActorId", () => {
  it("cria o ator sistema com papel super_admin na primeira chamada", async () => {
    const id = await getSystemActorId();
    expect(id).toBeTruthy();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    expect(user?.email).toBe(SYSTEM_ACTOR_EMAIL);

    const roles = await db
      .select()
      .from(roleAssignments)
      .where(eq(roleAssignments.userId, id));
    expect(roles.some((r) => r.role === "super_admin")).toBe(true);
  });

  it("é idempotente — chamadas seguintes retornam o mesmo id sem duplicar", async () => {
    const first = await getSystemActorId();
    const second = await getSystemActorId();
    expect(second).toBe(first);

    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, SYSTEM_ACTOR_EMAIL));
    expect(rows.length).toBe(1);
  });
});
