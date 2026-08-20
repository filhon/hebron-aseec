"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { BusinessError } from "@hebron/auth/safe-action-error";
import {
  withAuthenticatedContext,
  withSystemRole,
} from "@hebron/db/authenticated";
import { dashboardConfigs } from "@hebron/db/schema";
import { updateDashboardWidgetsSchema } from "@hebron/validators/intranet";
import { staffAction } from "../lib/safe-action";
import { logIntranetAudit } from "../lib/audit";

// ---------------------------------------------------------------------------
// getDashboardConfig — configuração de widgets do usuário autenticado
// (0037_intranet_rls.sql: dashboard_configs_write_own, 1 linha por usuário).
// ---------------------------------------------------------------------------

export const getDashboardConfig = staffAction
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const rows = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      (tx) =>
        tx
          .select()
          .from(dashboardConfigs)
          .where(eq(dashboardConfigs.userId, ctx.actorId))
          .limit(1),
    );

    return { config: rows[0] ?? null };
  });

// ---------------------------------------------------------------------------
// saveDashboardConfig — upsert do arranjo de widgets do usuário
// autenticado (adicionar/remover/reordenar).
// ---------------------------------------------------------------------------

export const saveDashboardConfig = staffAction
  .schema(updateDashboardWidgetsSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const config = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(dashboardConfigs)
          .values({ userId: ctx.actorId, widgets: input.widgets })
          .onConflictDoUpdate({
            target: dashboardConfigs.userId,
            set: { widgets: input.widgets, updatedAt: new Date() },
          })
          .returning();
        if (!row)
          throw new BusinessError("Falha ao salvar configuração do painel");

        await withSystemRole(tx, (sysTx) =>
          logIntranetAudit(
            {
              actorId: ctx.actorId,
              action: "dashboard_config.updated",
              entity: "dashboard_config",
              entityId: row.id,
              diff: { widgetCount: input.widgets.length },
            },
            sysTx,
          ),
        );

        return row;
      },
    );

    return { config };
  });
