import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { db } from "@hebron/db/client";
import { eq } from "drizzle-orm";
import { roleAssignments } from "@hebron/db/schema";
import type { Role } from "@hebron/types/roles";

// ---------------------------------------------------------------------------
// Session resolution
// ---------------------------------------------------------------------------

async function resolveSession(): Promise<{ actorId: string; roles: Role[] }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Variáveis Supabase não configuradas");
  }

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { cookie: cookieHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error ?? !user) throw new Error("Não autenticado");

  const rows = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.userId, user.id));

  const roles: Role[] = rows.map((r) => r.role);
  return { actorId: user.id, roles };
}

// ---------------------------------------------------------------------------
// Base authenticated action — any role
// ---------------------------------------------------------------------------

const baseAction = createSafeActionClient().use(async ({ next }) => {
  const { actorId, roles } = await resolveSession();
  return next({ ctx: { actorId, roles } });
});

export { baseAction as financeiroAction };

// ---------------------------------------------------------------------------
// Role-specific action clients
// ---------------------------------------------------------------------------

/** Requires colaborador OR diretor OR super_admin */
export const colaboradorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["colaborador", "diretor", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new Error("Acesso negado: papel colaborador obrigatório");
  }
  return next({ ctx });
});

/** Requires diretor OR super_admin */
export const diretorAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["diretor", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new Error("Acesso negado: papel diretor obrigatório");
  }
  return next({ ctx });
});

/** Requires super_admin exclusively */
export const superAdminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new Error("Acesso negado: apenas super_admin");
  }
  return next({ ctx });
});
