"use server";

import { and, eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { enrollments } from "@hebron/db/schema";
import { enrollInCourseSchema } from "@hebron/validators";
import { plataformaAction } from "../lib/safe-action";

// ---------------------------------------------------------------------------
// enrollInCourse — cria a matrícula (RLS enrollments_insert_own já valida
// que o curso está publicado). Idempotente: se a matrícula já existe
// (enrollments_user_course_uniq), retorna a linha existente em vez de
// falhar — o botão "Matricular-se" pode ser clicado mais de uma vez sem
// gerar erro para o aluno.
// ---------------------------------------------------------------------------

export const enrollInCourse = plataformaAction
  .schema(enrollInCourseSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const enrollment = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [inserted] = await tx
          .insert(enrollments)
          .values({ userId: ctx.actorId, courseId: input.courseId })
          .onConflictDoNothing({
            target: [enrollments.userId, enrollments.courseId],
          })
          .returning();
        if (inserted) return inserted;

        const [existing] = await tx
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.userId, ctx.actorId),
              eq(enrollments.courseId, input.courseId),
            ),
          )
          .limit(1);
        if (!existing) throw new Error("Falha ao matricular no curso");
        return existing;
      },
    );

    return { enrollment };
  });
