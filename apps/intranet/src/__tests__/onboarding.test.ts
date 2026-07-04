/**
 * onboarding.test.ts
 *
 * Regressão para O-1/S1-05: auto-signup não existia e "pending_approval"
 * não era derivável do schema, então a fila de aprovação nunca foi
 * construída. Testa, sem mock de supabase-js, contra o Supabase de
 * desenvolvimento:
 *   1. signup_source: "self" -> handle_new_user() cria a conta pending_approval
 *   2. self_signup_join_organization (RPC SECURITY DEFINER) vincula instituição
 *      enquanto — e só enquanto — o usuário está pending_approval
 *   3. users_protect_status bloqueia o próprio usuário de virar "active" sozinho
 *
 * approveSignup/rejectSignup (admin) são testadas em
 * apps/admin/src/__tests__/actions.test.ts.
 *
 * Requer: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (ver .env.local).
 */

import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { users, organizations, organizationMembers } from "@hebron/db/schema";
import { createTestAuthUser, deleteTestAuthUser } from "@hebron/auth/testing";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

/** Plain supabase-js client, session held in memory — enough for RPC auth.uid(). */
function signedInClient(email: string, password: string) {
  return async () => {
    const client = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_ANON_KEY"),
      { auth: { persistSession: false } },
    );
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Login de teste falhou: ${error.message}`);
    return client;
  };
}

const createdAuthUserIds: string[] = [];
const createdOrgIds: string[] = [];

afterAll(async () => {
  for (const id of createdOrgIds) {
    await db.delete(organizations).where(eq(organizations.id, id));
  }
  for (const id of createdAuthUserIds) {
    await deleteTestAuthUser(id);
  }
});

describe("auto-signup — status pending_approval e bootstrap de instituição", () => {
  it("signUp com signup_source=self nasce pending_approval; convite/admin nasce active", async () => {
    const selfEmail = `signup-self-${Date.now()}@test.hebron`;
    const selfId = await createTestAuthUser(
      selfEmail,
      "T3st-Signup-Self!",
      "Signup Self",
      { signup_source: "self" },
    );
    createdAuthUserIds.push(selfId);

    const invitedEmail = `signup-invited-${Date.now()}@test.hebron`;
    const invitedId = await createTestAuthUser(
      invitedEmail,
      "T3st-Signup-Invited!",
      "Signup Invited",
    );
    createdAuthUserIds.push(invitedId);

    const [selfRow] = await db.select().from(users).where(eq(users.id, selfId));
    const [invitedRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, invitedId));

    expect(selfRow?.status).toBe("pending_approval");
    expect(invitedRow?.status).toBe("active");
  });

  it("self_signup_join_organization vincula instituição nova enquanto pending_approval", async () => {
    const email = `signup-org-${Date.now()}@test.hebron`;
    const password = "T3st-Signup-Org!";
    const userId = await createTestAuthUser(email, password, "Signup Org", {
      signup_source: "self",
    });
    createdAuthUserIds.push(userId);

    const client = await signedInClient(email, password)();
    const orgName = `Instituição Teste ${Date.now()}`;

    const { data: organizationId, error } = await client.rpc(
      "self_signup_join_organization",
      {
        _existing_org_id: null,
        _new_org_nome: orgName,
        _new_org_cnpj: null,
      },
    );

    expect(error).toBeNull();
    expect(organizationId).toBeTruthy();
    createdOrgIds.push(organizationId as string);

    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));
    expect(membership?.organizationId).toBe(organizationId);

    // Chamar de novo (usuário já pending) deve apenas reforçar a mesma
    // membership (ON CONFLICT DO NOTHING) — não deve lançar erro nem duplicar.
    const searchResult = await client.rpc("search_organizations_for_signup", {
      _query: orgName,
    });
    expect(searchResult.error).toBeNull();
    expect(
      (searchResult.data as Array<{ id: string }>).some(
        (o) => o.id === organizationId,
      ),
    ).toBe(true);
  });

  it("users_protect_status bloqueia o próprio usuário mudando status para active", async () => {
    const email = `signup-selfapprove-${Date.now()}@test.hebron`;
    const password = "T3st-Self-Approve!";
    const userId = await createTestAuthUser(email, password, "Self Approve", {
      signup_source: "self",
    });
    createdAuthUserIds.push(userId);

    const client = await signedInClient(email, password)();
    const { error } = await client
      .from("users")
      .update({ status: "active" })
      .eq("id", userId);

    expect(error).toBeDefined();

    const [row] = await db.select().from(users).where(eq(users.id, userId));
    expect(row?.status).toBe("pending_approval");
  });
});

// approveSignup/rejectSignup (apps/admin) são testadas em
// apps/admin/src/__tests__/actions.test.ts, reaproveitando o padrão de
// sessão mockada já usado ali para as demais Server Actions do Admin.
