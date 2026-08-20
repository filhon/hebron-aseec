import { createSafeActionClient } from "next-safe-action";
import {
  BusinessError,
  handleServerError,
} from "@hebron/auth/safe-action-error";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { resolveSession } from "@hebron/auth/server";
import { db } from "@hebron/db/client";
import { instructors } from "@hebron/db/schema";

// ---------------------------------------------------------------------------
// Base authenticated action — any role. Acesso ao catálogo/curso é liberado
// a qualquer usuário registrado, sem restrição por papel (BRAIN §6.3).
// ---------------------------------------------------------------------------

const baseAction = createSafeActionClient({ handleServerError }).use(
  async ({ next }) => {
    const cookieStore = await cookies();
    const { actorId, roles } = await resolveSession(cookieStore);
    return next({ ctx: { actorId, roles } });
  },
);

export { baseAction as plataformaAction };

// ---------------------------------------------------------------------------
// "Instrutor" não é um papel em public.role — é definido por dado (linha em
// plataforma.instructors vinculada ao próprio user_id), mesma leitura de
// plataforma.is_instructor() em 0020_plataforma_rls.sql (suposição G1
// registrada em SESSIONS.md de P-6.7).
// ---------------------------------------------------------------------------

async function isInstructor(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: instructors.id })
    .from(instructors)
    .where(eq(instructors.userId, userId))
    .limit(1);
  return !!row;
}

/**
 * Requires super_admin OU instrutor (dado) — espelha courses_mutate_staff /
 * modules_mutate_staff / lessons_mutate_staff / quizzes_mutate_staff /
 * series_mutate_staff / discussions_mutate_staff de 0020_plataforma_rls.sql.
 * Qualquer instrutor tem CRUD completo (sem escopo por curso — mesma
 * suposição G1 da RLS).
 */
export const staffAction = baseAction.use(async ({ next, ctx }) => {
  if (ctx.roles.includes("super_admin")) return next({ ctx });
  if (await isInstructor(ctx.actorId)) return next({ ctx });
  throw new BusinessError("Acesso negado: apenas super_admin ou instrutor");
});

/** Requires super_admin exclusively — moderação de discussões. */
export const superAdminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new BusinessError("Acesso negado: apenas super_admin");
  }
  return next({ ctx });
});
