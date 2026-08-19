import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import {
  users,
  roleAssignments,
  designations,
  consents,
  dataDeletionRequests,
  certificates,
  termAcceptances,
} from "@hebron/db/schema";
import { createSupabaseServerActionClient } from "./server";
import type { ServerCookieHandlers } from "./server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Test-only helpers for exercising the real Supabase Auth flow (no mocks)
 * from an integration test. Reserved for `__tests__` — never import this
 * from application code (it requires SUPABASE_SERVICE_ROLE_KEY).
 */

export interface TestSessionCookieStore {
  getAll(): Array<{ name: string; value: string }>;
  set(name: string, value: string, options?: unknown): void;
}

/**
 * Creates a real Supabase Auth user via the Admin API (email pre-confirmed
 * so password login works immediately). Returns the auth user id.
 *
 * A DB trigger (`on_auth_user_created`) mirrors the new `auth.users` row
 * into `public.users` automatically — callers must NOT also insert into
 * `public.users` for this id, or the insert collides with the trigger's row
 * (unique violation on the primary key).
 */
export async function createTestAuthUser(
  email: string,
  password: string,
  fullName?: string,
  extraMetadata?: Record<string, unknown>,
): Promise<string> {
  const admin = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
  const metadata = {
    ...(fullName ? { full_name: fullName } : {}),
    ...extraMetadata,
  };
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });
  if (error || !data.user) {
    throw new Error(
      `Falha ao criar usuário de teste: ${error?.message ?? "sem usuário"}`,
    );
  }
  return data.user.id;
}

/**
 * Deletes a test auth user created via createTestAuthUser.
 *
 * public.users has NO foreign key to auth.users (confirmed via pg_constraint,
 * D2-001, AUDIT/04-BACKLOG-CORRECAO.md PACOTE 2 — that FK fix was drafted and
 * then deferred, S-[current], because adding it breaks the ~84 test files
 * across the repo that insert public.users fixtures with synthetic ids that
 * were never real auth.users; that redesign needs its own session). Until
 * then, `admin.auth.admin.deleteUser` only ever deleted auth.users — the
 * on_auth_user_created trigger mirrors INSERT into public.users but nothing
 * mirrors DELETE, so public.users (and everything referencing it) leaked on
 * every real test run (see memory project_delete_test_auth_user_no_cascade —
 * 542 orphaned rows found in the shared dev DB). This explicitly cleans up
 * the rows a real deletion would need to touch anyway before deleting the
 * auth user, so cleanup actually works instead of silently leaking.
 *
 * A test that inserts rows in OTHER tables referencing this user (e.g. a
 * financeiro payable created_by this user) still needs its own cleanup
 * before calling this.
 */
export async function deleteTestAuthUser(userId: string): Promise<void> {
  await db.delete(roleAssignments).where(eq(roleAssignments.userId, userId));
  await db.delete(designations).where(eq(designations.userId, userId));
  await db.delete(consents).where(eq(consents.userId, userId));
  await db
    .delete(dataDeletionRequests)
    .where(eq(dataDeletionRequests.userId, userId));
  await db.delete(certificates).where(eq(certificates.userId, userId));
  await db.delete(termAcceptances).where(eq(termAcceptances.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  const admin = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
  await admin.auth.admin.deleteUser(userId);
}

/**
 * Performs a real `signInWithPassword` against Supabase Auth and returns a
 * cookie jar populated exactly as a browser's would be after login — using
 * the same `createSupabaseServerActionClient` code path production runs, so
 * the cookie name/encoding never needs to be reimplemented by hand here.
 *
 * The returned store can be handed directly to `resolveSession()` (or to a
 * mocked `next/headers.cookies()`) to test a real, unmocked auth round trip.
 */
export async function createTestSessionCookies(
  email: string,
  password: string,
): Promise<TestSessionCookieStore> {
  const store = new Map<string, string>();

  const handlers: ServerCookieHandlers = {
    getAll: () =>
      Array.from(store.entries()).map(([name, value]) => ({ name, value })),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value }) => {
        if (value) store.set(name, value);
        else store.delete(name);
      });
    },
  };

  const signInClient = createSupabaseServerActionClient(handlers);
  const { error } = await signInClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw new Error(`Login de teste falhou: ${error.message}`);
  }

  return {
    getAll: handlers.getAll,
    set: (name, value) => {
      if (value) store.set(name, value);
      else store.delete(name);
    },
  };
}
