"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { courses, series } from "@hebron/db/schema";
import { seriesSchema } from "@hebron/validators";
import { staffAction } from "../lib/safe-action";

// ---------------------------------------------------------------------------
// series — CRUD restrito a staff (super_admin OU instrutor, RLS
// `series_mutate_staff`, 0020_plataforma_rls.sql). Gap irmão de S-113
// (P-6.13): `plataforma.series` existe desde P-6.6/PATCH-024 e a RLS libera
// staff desde P-6.7, mas nenhuma action jamais escreveu na tabela — o select
// "Série" do CourseForm e o filtro do catálogo ficavam vazios sem INSERT
// manual no banco (P-6.19).
// ---------------------------------------------------------------------------

export const createSeries = staffAction
  .schema(seriesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const item = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .insert(series)
          .values({
            name: input.name,
            slug: input.slug,
            description: input.description,
          })
          .returning();
        if (!row) throw new Error("Falha ao criar série");
        return row;
      },
    );

    return { series: item };
  });

const updateSeriesSchema = seriesSchema.extend({
  seriesId: z.string().uuid(),
});

export const updateSeries = staffAction
  .schema(updateSeriesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const item = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [row] = await tx
          .update(series)
          .set({
            name: input.name,
            slug: input.slug,
            description: input.description,
            updatedAt: new Date(),
          })
          .where(eq(series.id, input.seriesId))
          .returning();
        if (!row) throw new Error("Série não encontrada");
        return row;
      },
    );

    return { series: item };
  });

const deleteSeriesSchema = z.object({ seriesId: z.string().uuid() });

/**
 * Remoção bloqueada se houver curso vinculado — mesmo padrão de
 * `deleteInstructor` (P-6.13): `courses.series_id` já rejeitaria via
 * `ON DELETE SET NULL`, então a checagem aqui existe só para dar uma
 * mensagem legível em vez de apagar a série silenciosamente e órfãos de
 * `series_id` ficarem nulos sem o instrutor perceber.
 */
export const deleteSeries = staffAction
  .schema(deleteSeriesSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    await withAuthenticatedContext({ actorId: ctx.actorId }, async (tx) => {
      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(courses)
        .where(eq(courses.seriesId, input.seriesId));
      if ((countRow?.count ?? 0) > 0) {
        throw new Error(
          "Não é possível remover: há cursos vinculados a esta série",
        );
      }

      const [row] = await tx
        .delete(series)
        .where(eq(series.id, input.seriesId))
        .returning({ id: series.id });
      if (!row) throw new Error("Série não encontrada");
    });

    return { success: true };
  });
