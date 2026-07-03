import { createClient } from "@supabase/supabase-js";
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
): Promise<string> {
  const admin = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (error || !data.user) {
    throw new Error(
      `Falha ao criar usuário de teste: ${error?.message ?? "sem usuário"}`,
    );
  }
  return data.user.id;
}

/** Deletes a test auth user created via createTestAuthUser. */
export async function deleteTestAuthUser(userId: string): Promise<void> {
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
