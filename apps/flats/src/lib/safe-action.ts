import { createSafeActionClient } from "next-safe-action";
import {
  BusinessError,
  handleServerError,
} from "@hebron/auth/safe-action-error";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";
import type { Role } from "@hebron/types/roles";

// ---------------------------------------------------------------------------
// Base authenticated action — any role. Espelha o padrão local de cada app
// (apps/financeiro, apps/tarefas/src/lib/safe-action.ts) — G6.1: usa
// resolveSession de @hebron/auth/server, nunca um createClient local.
// ---------------------------------------------------------------------------

const baseAction = createSafeActionClient({ handleServerError }).use(
  async ({ next }) => {
    const cookieStore = await cookies();
    const { actorId, roles, designations } = await resolveSession(cookieStore);
    return next({ ctx: { actorId, roles, designations } });
  },
);

export { baseAction as flatsAction };

// ---------------------------------------------------------------------------
// Role-specific action clients — espelham as policies de RLS de
// 0022_flats_rls.sql (defense in depth, G6 do CLAUDE.md).
// ---------------------------------------------------------------------------

/**
 * Requires papel hospede OU super_admin — elegibilidade de reserva (BRAIN
 * §6.8): pastores/missionários/cônjuges recebem o papel hospede na
 * concessão de acesso; diretor/conselheiro nunca o têm (conflito de
 * interesse, mesma regra de reservations_insert_own).
 */
export const hospedeAction = baseAction.use(async ({ next, ctx }) => {
  const allowed: Role[] = ["hospede", "super_admin"];
  if (!ctx.roles.some((r) => allowed.includes(r))) {
    throw new BusinessError("Acesso negado: papel hóspede obrigatório");
  }
  return next({ ctx });
});

/**
 * Requires diretor com designation "gestor", OU super_admin como bypass
 * operacional — mesmo padrão de diretorWithDesignationAction em
 * apps/financeiro/src/lib/safe-action.ts.
 */
export const gestorAction = baseAction.use(async ({ next, ctx }) => {
  if (ctx.roles.includes("super_admin")) return next({ ctx });
  if (!ctx.roles.includes("diretor") || !ctx.designations.includes("gestor")) {
    throw new BusinessError(
      'Acesso negado: requer diretor com designação "gestor"',
    );
  }
  return next({ ctx });
});
