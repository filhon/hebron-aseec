"use server";

import { eq } from "drizzle-orm";
import { withAuthenticatedContext } from "@hebron/db/authenticated";
import { lessons, progress } from "@hebron/db/schema";
import { markLessonCompleteSchema } from "@hebron/validators";
import { plataformaAction } from "../lib/safe-action";
import { checkAndIssueCertificate } from "./certificates";
import { notifyCertificateIssued } from "../lib/notifications";
import { BusinessError } from "@hebron/auth/safe-action-error";

// ---------------------------------------------------------------------------
// markLessonComplete — RLS (progress_insert_own/progress_update_own,
// 0020_plataforma_rls.sql) já garante matrícula + trilha sequencial
// (plataforma.can_access_lesson); esta action cobre a semântica de negócio
// que a RLS não expressa: aulas de tipo "quiz" NÃO se completam por aqui —
// a conclusão é automática ao atingir a nota mínima (submitQuizAttempt em
// quizzes.ts, decisão D-5 da auditoria).
// ---------------------------------------------------------------------------

export const markLessonComplete = plataformaAction
  .schema(markLessonCompleteSchema)
  .action(async ({ parsedInput: input, ctx }) => {
    const result = await withAuthenticatedContext(
      { actorId: ctx.actorId },
      async (tx) => {
        const [lesson] = await tx
          .select({
            id: lessons.id,
            type: lessons.type,
            courseId: lessons.courseId,
          })
          .from(lessons)
          .where(eq(lessons.id, input.lessonId))
          .limit(1);
        if (!lesson) throw new BusinessError("Aula não encontrada");
        if (lesson.type === "quiz") {
          throw new BusinessError(
            "Aulas de quiz são concluídas ao atingir a nota mínima no quiz",
          );
        }

        const [progressRow] = await tx
          .insert(progress)
          .values({
            userId: ctx.actorId,
            lessonId: lesson.id,
            courseId: lesson.courseId,
            completedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [progress.userId, progress.lessonId],
            set: { completedAt: new Date() },
          })
          .returning();
        if (!progressRow)
          throw new BusinessError("Falha ao registrar progresso");

        const certificate = await checkAndIssueCertificate(tx, {
          actorId: ctx.actorId,
          courseId: lesson.courseId,
        });

        return { progress: progressRow, certificate };
      },
    );

    // Notificação best-effort, fora da transação (P-6.10).
    if (result.certificate) {
      await notifyCertificateIssued(result.certificate.id);
    }

    return result;
  });
