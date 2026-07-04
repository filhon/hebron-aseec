import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { designations, roleAssignments } from "@hebron/db/schema";
import type { DesignationType, Role } from "@hebron/types/roles";

export interface ServerCookieHandlers {
  getAll(): Array<{ name: string; value: string }>;
  setAll?: (
    cookies: Array<{ name: string; value: string; options?: CookieOptions }>,
  ) => void;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Creates a Supabase server client for use in Server Actions and Route Handlers.
 * Reads the session from SSR cookies via the provided handlers.
 */
export function createSupabaseServerActionClient(
  handlers: ServerCookieHandlers,
): SupabaseClient {
  return createServerClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: handlers.getAll,
        setAll: handlers.setAll ?? (() => undefined),
      },
    },
  );
}

/**
 * Minimal shape of the object Next.js `cookies()` resolves to inside a
 * Server Action / Route Handler: readable in full, and settable one at a
 * time. Kept structural (not imported from "next/headers") so this package
 * stays framework-agnostic — callers pass their own `await cookies()`.
 */
export interface ActionCookieStore {
  getAll(): Array<{ name: string; value: string }>;
  set(name: string, value: string, options?: CookieOptions): void;
}

export interface ActionSession {
  actorId: string;
  roles: Role[];
  designations: DesignationType[];
}

/**
 * Resolves the authenticated user + roles from SSR cookies in a Server Action.
 *
 * This is the ONLY correct way to check auth in a Server Action. A raw
 * `createClient(url, anonKey, { global: { headers: { cookie: ... } } })`
 * (as used to be copy-pasted across apps) never parses Supabase's session
 * cookies — supabase-js manages sessions via its own storage, not via a
 * forwarded Cookie header — so `auth.getUser()` silently resolves to no user
 * for everyone. `createServerClient` from `@supabase/ssr` is the piece that
 * actually decodes the session cookie and validates the JWT.
 *
 * Throws "Não autenticado" when there is no valid session.
 */
export async function resolveSession(
  cookieStore: ActionCookieStore,
): Promise<ActionSession> {
  const supabase = createSupabaseServerActionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Ignore: read-only context (e.g. Server Component)
        }
      });
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Não autenticado");

  const rows = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.userId, user.id));

  const designationRows = await db
    .select({ type: designations.type })
    .from(designations)
    .where(eq(designations.userId, user.id));

  return {
    actorId: user.id,
    roles: rows.map((r) => r.role),
    designations: designationRows.map((d) => d.type),
  };
}
