import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { db } from "@hebron/db/client";
import { eq } from "drizzle-orm";
import { roleAssignments } from "@hebron/db/schema";

function getSupabaseFromCookies(cookieHeader: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Variáveis Supabase não configuradas");
  return createClient(url, key, {
    global: { headers: { cookie: cookieHeader } },
    auth: { persistSession: false },
  });
}

async function resolveUser() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const supabase = getSupabaseFromCookies(cookieHeader);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Não autenticado");
  return user;
}

/** editor: super_admin, diretor, conselheiro, colaborador */
export const editorAction = createSafeActionClient().use(async ({ next }) => {
  const user = await resolveUser();

  const rows = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.userId, user.id));

  const editorRoles = ["super_admin", "diretor", "conselheiro", "colaborador"];
  if (!rows.some((r) => editorRoles.includes(r.role))) {
    throw new Error("Acesso negado: papel insuficiente para esta operação");
  }

  return next({ ctx: { actorId: user.id } });
});

/** adminDocAction: super_admin ou diretor (para editais com implicações jurídicas) */
export const adminDocAction = createSafeActionClient().use(async ({ next }) => {
  const user = await resolveUser();

  const rows = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.userId, user.id));

  const adminRoles = ["super_admin", "diretor"];
  if (!rows.some((r) => adminRoles.includes(r.role))) {
    throw new Error("Acesso negado: apenas super_admin ou diretor");
  }

  return next({ ctx: { actorId: user.id } });
});

/** authenticatedAction: qualquer usuário autenticado */
export const authenticatedAction = createSafeActionClient().use(
  async ({ next }) => {
    const user = await resolveUser();
    return next({ ctx: { actorId: user.id } });
  },
);
