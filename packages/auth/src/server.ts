import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { designations, roleAssignments } from "@hebron/db/schema";
import type { DesignationType, Role } from "@hebron/types/roles";
import { BusinessError } from "./safe-action-error";
import {
  IMPERSONATION_COOKIE_NAME,
  resolveVerifiedImpersonationState,
} from "./impersonation";

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
  /**
   * Set only while an impersonation cookie is active: the real, authenticated
   * super_admin's id. `actorId`/`roles`/`designations` above describe the
   * *impersonated* user in that case — the effective identity every RLS
   * policy and role gate sees, so "view as" genuinely shows what that user
   * sees (BRAIN §6.1/§6.8). Audit call sites must log `impersonatedBy` (when
   * present) as the actor, never `actorId` — @hebron/db/audit's `logAudit`
   * does this automatically via its `realActorId` param.
   */
  impersonatedBy?: string;
}

async function fetchRolesAndDesignations(
  userId: string,
): Promise<Pick<ActionSession, "roles" | "designations">> {
  const rows = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, userId),
        isNull(roleAssignments.revokedAt),
      ),
    );

  const designationRows = await db
    .select({ type: designations.type })
    .from(designations)
    .where(
      and(eq(designations.userId, userId), isNull(designations.revokedAt)),
    );

  return {
    roles: rows.map((r) => r.role),
    designations: designationRows.map((d) => d.type),
  };
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
 *
 * When a verified `hb-impersonation` cookie is present AND belongs to this
 * exact authenticated user AND that user currently still holds `super_admin`
 * (re-checked fresh from the DB, not trusted from the cookie), the returned
 * session describes the *impersonated* user instead — see `impersonatedBy`
 * on `ActionSession`. Any other case (missing/invalid/expired cookie,
 * cookie minted for a different user, role since revoked) is treated as "not
 * impersonating" and falls back to the real session — fail-closed to the
 * caller's own identity rather than throwing, so a stale cookie never locks
 * anyone out.
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

  if (error || !user) throw new BusinessError("Não autenticado");

  const real = await fetchRolesAndDesignations(user.id);

  const impersonationCookie = cookieStore
    .getAll()
    .find((c) => c.name === IMPERSONATION_COOKIE_NAME)?.value;
  const impersonation = resolveVerifiedImpersonationState(impersonationCookie);

  if (
    impersonation &&
    impersonation.actorId === user.id &&
    real.roles.includes("super_admin")
  ) {
    const impersonated = await fetchRolesAndDesignations(
      impersonation.impersonatedId,
    );
    return {
      actorId: impersonation.impersonatedId,
      roles: impersonated.roles,
      designations: impersonated.designations,
      impersonatedBy: user.id,
    };
  }

  return { actorId: user.id, ...real };
}
