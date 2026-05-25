"use server";

import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { roleAssignments } from "@hebron/db/schema";

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurado");
  const client = postgres(url, { prepare: false });
  return drizzle(client);
}

/**
 * Admin safe-action client.
 * Middleware valida sessão Supabase + papel super_admin no banco.
 * Injeta { actorId } no contexto de todos os actions.
 */
export const adminAction = createSafeActionClient().use(async ({ next }) => {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios",
    );
  }

  // Forward cookies to Supabase to resolve the session
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

  if (error || !user) {
    throw new Error("Não autenticado");
  }

  const db = getDb();
  const rows = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.userId, user.id));

  const isSuperAdmin = rows.some((r) => r.role === "super_admin");
  if (!isSuperAdmin) {
    throw new Error(
      "Acesso negado: apenas super_admin pode executar esta ação",
    );
  }

  return next({ ctx: { actorId: user.id } });
});
