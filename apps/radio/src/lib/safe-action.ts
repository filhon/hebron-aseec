import { createSafeActionClient } from "next-safe-action";
import {
  BusinessError,
  handleServerError,
} from "@hebron/auth/safe-action-error";
import { cookies } from "next/headers";
import { resolveSession } from "@hebron/auth/server";

// ---------------------------------------------------------------------------
// Base authenticated action — espelha o padrão local de cada app (G6.1: usa
// resolveSession de @hebron/auth/server, nunca um createClient local).
// ---------------------------------------------------------------------------

const baseAction = createSafeActionClient({ handleServerError }).use(
  async ({ next }) => {
    const cookieStore = await cookies();
    const { actorId, roles, designations } = await resolveSession(cookieStore);
    return next({ ctx: { actorId, roles, designations } });
  },
);

export { baseAction as radioAction };

/**
 * Requires super_admin — espelha literalmente as policies de RLS de
 * 0050_radio_rls.sql: toda mutação no schema `radio` (authors, series,
 * tracks, playlists, playlist_tracks, now_playing, exclusive_materials,
 * listener_stats) é `FOR ALL TO authenticated USING/WITH CHECK
 * (public.has_role('super_admin'))`. Nenhum outro papel escreve neste
 * schema — mesmo padrão de superAdminAction em
 * apps/plataforma/src/lib/safe-action.ts.
 */
export const superAdminAction = baseAction.use(async ({ next, ctx }) => {
  if (!ctx.roles.includes("super_admin")) {
    throw new BusinessError("Acesso negado: apenas super_admin");
  }
  return next({ ctx });
});
