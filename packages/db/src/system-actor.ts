import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { users, roleAssignments } from "./schema/public";

const SYSTEM_ACTOR_EMAIL = "sistema@hebronaseec.org.br";

let cachedId: string | null = null;

/**
 * Ator usado por jobs em background (packages/jobs, P-0.14) que não têm
 * sessão HTTP/cookie associada — um cron não é "ninguém" neste sistema:
 * `admin.audit_log.actor_id` é NOT NULL com FK para `public.users`, e as
 * policies de RLS (decisão B, P-0.10) só autorizam escrita para quem tem um
 * papel real em `public.role_assignments`. Get-or-create idempotente:
 * primeira chamada em cada ambiente cria o usuário via Admin API (não por
 * INSERT direto em auth.users — mesmo padrão de
 * packages/auth/src/testing.ts::createTestAuthUser, para não recriar à mão
 * os invariantes que o GoTrue mantém) e concede papel super_admin (precisa
 * satisfazer has_role() em qualquer schema que um cron leia/escreva —
 * admin, projetos, financeiro...). Chamadas seguintes apenas consultam por
 * email e usam cache em memória por processo.
 */
export async function getSystemActorId(): Promise<string> {
  if (cachedId) return cachedId;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SYSTEM_ACTOR_EMAIL))
    .limit(1);

  if (existing) {
    cachedId = existing.id;
    return existing.id;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY são necessários para provisionar o ator sistema (packages/jobs, P-0.14).",
    );
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await admin.auth.admin.createUser({
    email: SYSTEM_ACTOR_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { full_name: "Sistema (jobs automáticos)" },
  });

  if (error || !data.user) {
    // Corrida possível: outro processo criou o usuário entre o SELECT acima
    // e este createUser (Supabase rejeita e-mail duplicado).
    const [retry] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, SYSTEM_ACTOR_EMAIL))
      .limit(1);
    if (retry) {
      cachedId = retry.id;
      return retry.id;
    }
    throw new Error(
      `Falha ao provisionar ator sistema: ${error?.message ?? "sem usuário retornado"}`,
    );
  }

  const id = data.user.id;

  await db
    .insert(roleAssignments)
    .values({ userId: id, role: "super_admin", scope: "global" });

  cachedId = id;
  return id;
}
